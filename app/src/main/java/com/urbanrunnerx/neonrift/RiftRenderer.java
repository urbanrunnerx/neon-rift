package com.urbanrunnerx.neonrift;

import android.content.Context;
import android.opengl.GLES30;
import android.opengl.GLSurfaceView;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.concurrent.locks.LockSupport;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Native ES 3 renderer. All GL and simulation access happens on the GL thread. */
public final class RiftRenderer implements GLSurfaceView.Renderer {
    public interface Listener {
        void onReady(String gpu);
        void onStats(float fps,int width,int height);
        void onFailure(String message);
    }
    private final Context context;
    private final RiftSettings settings;
    private final Listener listener;
    private final RiftSimulation simulation=new RiftSimulation(731);
    private final HashMap<String,Integer> uniforms=new HashMap<>();
    private int program, width=1, height=1;
    private long previousNanos, sampleStart;
    private int frameCount;
    private boolean failed;

    public RiftRenderer(Context context,RiftSettings settings,Listener listener) {
        this.context=context.getApplicationContext();this.settings=settings;this.listener=listener;
    }
    @Override public void onSurfaceCreated(GL10 unused,EGLConfig config) {
        failed=false;previousNanos=0;sampleStart=0;frameCount=0;
        try {
            int vertex=compile(GLES30.GL_VERTEX_SHADER,readAsset("shaders/fullscreen.vert"));
            int fragment=compile(GLES30.GL_FRAGMENT_SHADER,readAsset("shaders/rift.frag"));
            program=GLES30.glCreateProgram();
            GLES30.glAttachShader(program,vertex);GLES30.glAttachShader(program,fragment);
            GLES30.glLinkProgram(program);
            int[] ok=new int[1];GLES30.glGetProgramiv(program,GLES30.GL_LINK_STATUS,ok,0);
            String log=GLES30.glGetProgramInfoLog(program);
            GLES30.glDeleteShader(vertex);GLES30.glDeleteShader(fragment);
            if(ok[0]==0) throw new IllegalStateException("Shader link: "+log);
            uniforms.clear();
            String[] names={"uResolution","uTime","uZoom","uGlow","uTurbulence","uTheme",
                "uCount","uQuality","uBalls","uPointer","uTouch","uPulse"};
            for(String name:names) uniforms.put(name,GLES30.glGetUniformLocation(program,name));
            GLES30.glDisable(GLES30.GL_DEPTH_TEST);GLES30.glDisable(GLES30.GL_BLEND);
            GLES30.glDisable(GLES30.GL_DITHER);
            Log.i("NeonRift","RENDERER_READY "+GLES30.glGetString(GLES30.GL_RENDERER));
            listener.onReady(GLES30.glGetString(GLES30.GL_RENDERER));
        } catch(Exception exception) {fail(exception);}
    }
    @Override public void onSurfaceChanged(GL10 unused,int w,int h) {
        width=Math.max(w,1);height=Math.max(h,1);GLES30.glViewport(0,0,width,height);
    }
    @Override public void onDrawFrame(GL10 unused) {
        if(failed) {GLES30.glClearColor(.015f,.02f,.05f,1);GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT);return;}
        long now=System.nanoTime();
        long frameNanos=settings.quality==0?33_333_333L:16_666_667L;
        if(previousNanos!=0) {
            long remaining=frameNanos-(now-previousNanos);
            if(remaining>0) {LockSupport.parkNanos(remaining);now=System.nanoTime();}
        }
        float dt=previousNanos==0?0f:Math.min(.25f,(now-previousNanos)*1e-9f);
        previousNanos=now;
        if(!settings.paused)simulation.step(dt,settings.speed);
        GLES30.glUseProgram(program);
        GLES30.glUniform2f(u("uResolution"),width,height);
        GLES30.glUniform1f(u("uTime"),simulation.time);
        GLES30.glUniform1f(u("uZoom"),settings.zoom);
        GLES30.glUniform1f(u("uGlow"),settings.glow);
        GLES30.glUniform1f(u("uTurbulence"),settings.turbulence);
        GLES30.glUniform1i(u("uTheme"),settings.theme);
        GLES30.glUniform1i(u("uCount"),settings.count);
        GLES30.glUniform1i(u("uQuality"),settings.quality);
        GLES30.glUniform4fv(u("uBalls"),RiftSimulation.MAX_BALLS,simulation.balls,0);
        GLES30.glUniform2f(u("uPointer"),simulation.pointerX,simulation.pointerY);
        GLES30.glUniform1f(u("uTouch"),simulation.touching?1:0);
        GLES30.glUniform1f(u("uPulse"),simulation.pulse);
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES,0,3);
        frameCount++;
        if(sampleStart==0)sampleStart=now;
        if(now-sampleStart>1_000_000_000L) {
            int error=GLES30.glGetError();
            if(error!=GLES30.GL_NO_ERROR) {fail(new IllegalStateException("OpenGL error 0x"+Integer.toHexString(error)));return;}
            listener.onStats(frameCount*1e9f/(now-sampleStart),width,height);
            sampleStart=now;frameCount=0;
        }
    }
    public void resetClock() {previousNanos=0;sampleStart=0;frameCount=0;simulation.touching=false;}
    public void touch(float x,float y,boolean down) {simulation.touch(x,y,down);}
    public void pulse(float x,float y) {simulation.burst(x,y);}
    public void shuffle(long seed) {simulation.reset(seed);}
    private int u(String name) {return uniforms.get(name);}
    private int compile(int type,String text) {
        int shader=GLES30.glCreateShader(type);GLES30.glShaderSource(shader,text);GLES30.glCompileShader(shader);
        int[] ok=new int[1];GLES30.glGetShaderiv(shader,GLES30.GL_COMPILE_STATUS,ok,0);
        if(ok[0]==0) {
            String message=GLES30.glGetShaderInfoLog(shader);GLES30.glDeleteShader(shader);
            throw new IllegalStateException("Shader compile: "+message);
        }
        return shader;
    }
    private String readAsset(String name) throws Exception {
        try(InputStream input=context.getAssets().open(name);ByteArrayOutputStream output=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[8192];int length;
            while((length=input.read(buffer))!=-1)output.write(buffer,0,length);
            return new String(output.toByteArray(),StandardCharsets.UTF_8);
        }
    }
    private void fail(Exception exception) {
        failed=true;Log.e("NeonRift","RENDERER_FAILED",exception);
        listener.onFailure(exception.getMessage()==null?exception.toString():exception.getMessage());
    }
}
