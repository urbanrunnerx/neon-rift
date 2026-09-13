package com.urbanrunnerx.neonrift;

import java.util.Random;

/** Deterministic, frame-rate-independent motion; no Android dependencies. */
public final class RiftSimulation {
    public static final int MAX_BALLS = 40;
    public final float[] balls = new float[MAX_BALLS * 4];
    private final float[] phase = new float[MAX_BALLS];
    private final float[] rate = new float[MAX_BALLS];
    private final float[] radius = new float[MAX_BALLS];
    private final float[] dx = new float[MAX_BALLS], dy = new float[MAX_BALLS];
    private final float[] vx = new float[MAX_BALLS], vy = new float[MAX_BALLS];
    private double clock;
    public float time;
    public float pulse;
    public float pointerX, pointerY;
    public boolean touching;

    public RiftSimulation(long seed) { reset(seed); }

    public void reset(long seed) {
        Random random = new Random(seed);
        clock = 0; time = 0; pulse = 0; touching = false;
        for (int i=0; i<MAX_BALLS; i++) {
            phase[i] = random.nextFloat() * 6.2831853f;
            rate[i] = 0.12f + random.nextFloat() * 0.22f;
            radius[i] = i < 9 ? 0.15f+random.nextFloat()*0.115f : 0.037f+random.nextFloat()*0.10f;
            dx[i]=dy[i]=vx[i]=vy[i]=0;
        }
        updatePositions();
    }

    public void touch(float x, float y, boolean down) {
        if (!Float.isFinite(x) || !Float.isFinite(y)) return;
        pointerX = clamp(x, -4, 4); pointerY = clamp(y, -4, 4); touching = down;
    }

    public void burst(float x, float y) {
        touch(x,y,false); pulse=0.02f;
        for(int i=0;i<MAX_BALLS;i++) {
            float ax=balls[i*4]-x, ay=balls[i*4+1]-y;
            float d=(float)Math.sqrt(ax*ax+ay*ay+0.02f);
            vx[i]+=ax/d * 0.8f/(1+d); vy[i]+=ay/d * 0.8f/(1+d);
        }
    }

    public void step(float seconds, float speed) {
        if(!Float.isFinite(seconds)||!Float.isFinite(speed)||seconds<=0||speed<=0) return;
        float total = Math.min(seconds,0.25f)*clamp(speed,0.1f,2.0f);
        int steps=Math.max(1,(int)Math.ceil(total/0.008333334f));
        float dt=total/steps;
        for(int step=0;step<steps;step++) {
            clock+=dt; time=(float)clock;
            if(pulse>0) {pulse+=dt*0.82f;if(pulse>1.9f)pulse=0;}
            for(int i=0;i<MAX_BALLS;i++) {
                float ax=-dx[i]*5.2f-vx[i]*3.1f;
                float ay=-dy[i]*5.2f-vy[i]*3.1f;
                if(touching) {
                    float tx=pointerX-balls[i*4], ty=pointerY-balls[i*4+1];
                    float influence=1.8f/(0.15f+tx*tx+ty*ty);
                    ax+=clamp(tx*influence,-3.6f,3.6f);
                    ay+=clamp(ty*influence,-3.6f,3.6f);
                }
                vx[i]=clamp(vx[i]+ax*dt,-2.5f,2.5f);
                vy[i]=clamp(vy[i]+ay*dt,-2.5f,2.5f);
                dx[i]=clamp(dx[i]+vx[i]*dt,-1.2f,1.2f);
                dy[i]=clamp(dy[i]+vy[i]*dt,-1.2f,1.2f);
            }
            updatePositions();
        }
    }

    private void updatePositions() {
        for(int i=0;i<MAX_BALLS;i++) {
            double a=clock*rate[i]+phase[i];
            float spread=i<9?0.54f:0.91f;
            balls[i*4]=(float)(Math.cos(a)*spread+Math.sin(a*1.71+phase[i])*0.12)+dx[i];
            balls[i*4+1]=(float)(Math.sin(a*0.87+phase[i]*0.4)*spread*1.12
                    +Math.cos(a*1.31)*0.17)+dy[i];
            balls[i*4+2]=radius[i]*(0.84f+0.16f*(float)Math.sin(a*1.8+phase[i]));
            balls[i*4+3]=phase[i];
        }
    }

    private static float clamp(float x,float low,float high) { return Math.max(low,Math.min(high,x)); }
}
