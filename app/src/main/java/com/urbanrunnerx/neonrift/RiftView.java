package com.urbanrunnerx.neonrift;

import android.content.Context;
import android.opengl.GLSurfaceView;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.HapticFeedbackConstants;

public final class RiftView extends GLSurfaceView {
    private final RiftSettings settings;
    private final RiftRenderer renderer;
    private final ScaleGestureDetector scale;
    private final GestureDetector gestures;
    private int bufferWidth,bufferHeight;
    private boolean multiTouch;

    public RiftView(Context context,RiftSettings settings,RiftRenderer.Listener listener) {
        super(context);this.settings=settings;
        setEGLContextClientVersion(3);setEGLConfigChooser(8,8,8,8,0,0);
        setPreserveEGLContextOnPause(true);
        renderer=new RiftRenderer(context,settings,listener);setRenderer(renderer);
        setRenderMode(RENDERMODE_CONTINUOUSLY);
        setContentDescription("Interactive neon portal. Drag to attract droplets; pinch to zoom; double tap to pulse.");
        scale=new ScaleGestureDetector(context,new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override public boolean onScale(ScaleGestureDetector detector) {
                settings.zoom=Math.max(.65f,Math.min(1.8f,settings.zoom*detector.getScaleFactor()));return true;
            }
        });
        gestures=new GestureDetector(context,new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onDown(MotionEvent event) {return true;}
            @Override public boolean onSingleTapUp(MotionEvent event) {performClick();return true;}
            @Override public boolean onDoubleTap(MotionEvent event) {
                final float x=worldX(event.getX()),y=worldY(event.getY());
                queueEvent(()->renderer.pulse(x,y));performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);return true;
            }
        });
    }
    @Override public boolean performClick() {super.performClick();return true;}
    @Override public boolean onTouchEvent(MotionEvent event) {
        scale.onTouchEvent(event);gestures.onTouchEvent(event);
        int action=event.getActionMasked();
        if(action==MotionEvent.ACTION_DOWN)multiTouch=false;
        if(event.getPointerCount()>1)multiTouch=true;
        final boolean down=!multiTouch&&!scale.isInProgress()
                &&action!=MotionEvent.ACTION_UP&&action!=MotionEvent.ACTION_CANCEL;
        final float x=worldX(event.getX()),y=worldY(event.getY());
        queueEvent(()->renderer.touch(x,y,down));
        if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_CANCEL)multiTouch=false;
        return true;
    }
    private float worldX(float x) {return (2*x-getWidth())/(Math.max(1,Math.min(getWidth(),getHeight()))*settings.zoom);}
    private float worldY(float y) {return (getHeight()-2*y)/(Math.max(1,Math.min(getWidth(),getHeight()))*settings.zoom);}
    public void shuffle() {final long seed=System.nanoTime();queueEvent(()->renderer.shuffle(seed));}
    public void resetClock() {queueEvent(renderer::resetClock);}
    @Override protected void onSizeChanged(int w,int h,int oldw,int oldh) {
        super.onSizeChanged(w,h,oldw,oldh);post(this::applyQuality);
    }
    /** Surface buffer scales, but native Android controls retain full display resolution. */
    public void applyQuality() {
        int w=getWidth(),h=getHeight();if(w<=0||h<=0)return;
        int limit=settings.quality==0?960:(settings.quality==1?1440:2160);
        float factor=Math.min(1f,limit/(float)Math.max(w,h));
        int bw=Math.max(2,Math.round(w*factor/2)*2),bh=Math.max(2,Math.round(h*factor/2)*2);
        if(bw!=bufferWidth||bh!=bufferHeight) {bufferWidth=bw;bufferHeight=bh;getHolder().setFixedSize(bw,bh);}
    }
}
