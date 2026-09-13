package com.urbanrunnerx.neonrift;

import android.content.SharedPreferences;

/** Small volatile state shared by the UI and GL threads; simulation stays on GL thread. */
public final class RiftSettings {
    public volatile float speed = 0.75f, glow = 1.05f, turbulence = 0.80f, zoom = 0.90f;
    public volatile int theme = 0, count = 28, quality = 1;
    public volatile boolean paused;
    public void load(SharedPreferences p) {
        speed=limit(p.getFloat("speed",.75f),.15f,2f);
        glow=limit(p.getFloat("glow",1.05f),.25f,1.8f);
        turbulence=limit(p.getFloat("turbulence",.8f),0f,2f);
        zoom=limit(p.getFloat("zoom",.90f),.65f,1.8f);
        theme=Math.max(0,Math.min(3,p.getInt("theme",0)));
        count=Math.max(12,Math.min(40,p.getInt("count",28)));
        quality=Math.max(0,Math.min(2,p.getInt("quality",1)));
    }
    public void save(SharedPreferences p) {
        p.edit().putFloat("speed",speed).putFloat("glow",glow)
            .putFloat("turbulence",turbulence).putFloat("zoom",zoom)
            .putInt("theme",theme).putInt("count",count).putInt("quality",quality).apply();
    }
    private static float limit(float x,float a,float b) {
        return Float.isFinite(x)?Math.max(a,Math.min(b,x)):a;
    }
}
