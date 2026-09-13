package com.urbanrunnerx.neonrift;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import java.util.Locale;

/** Real Android UI above a native OpenGL ES SurfaceView. No browser or WebView. */
public final class MainActivity extends Activity implements RiftRenderer.Listener {
    private static final int WHITE=0xFFEDF2FF, MUTED=0xFF9AAAC5, ACCENT=0xFFAAE783;
    private static final String[] THEMES={"NEON","AURORA","EMBER","VOID"};
    private final RiftSettings settings=new RiftSettings();
    private RiftView rift;
    private SharedPreferences preferences;
    private FrameLayout root;
    private LinearLayout header,panel,tuning;
    private ScrollView panelScroll;
    private TextView status,subtitle;
    private Button pause,tune,cinemaExit;
    private Button[] themes;
    private String gpu="Initializing";
    private boolean cinema,errorShown,expanded;
    private int topInset,bottomInset,leftInset,rightInset;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.TRANSPARENT);getWindow().setNavigationBarColor(0xFF080B16);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        if(Build.VERSION.SDK_INT>=28) {
            WindowManager.LayoutParams p=getWindow().getAttributes();
            p.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(p);
        }
        preferences=getSharedPreferences("neon-rift",MODE_PRIVATE);settings.load(preferences);
        if(savedInstanceState!=null)settings.paused=savedInstanceState.getBoolean("paused",false);
        ActivityManager manager=(ActivityManager)getSystemService(Context.ACTIVITY_SERVICE);
        if(manager==null||manager.getDeviceConfigurationInfo().reqGlEsVersion<0x30000) {
            new AlertDialog.Builder(this).setTitle("OpenGL ES 3.0 is required")
                .setMessage("This device does not report the graphics capability Neon Rift needs. No browser fallback is used.")
                .setPositiveButton("Close",(d,w)->finish()).setCancelable(false).show();return;
        }
        root=new FrameLayout(this);root.setBackgroundColor(0xFF070B15);
        rift=new RiftView(this,settings,this);root.addView(rift,new FrameLayout.LayoutParams(-1,-1));
        makeHeader();makeControls();
        cinemaExit=button("CONTROLS",v->setCinema(false));
        FrameLayout.LayoutParams exitParams=new FrameLayout.LayoutParams(dp(124),dp(44),Gravity.BOTTOM|Gravity.END);
        exitParams.setMargins(dp(16),0,dp(16),dp(24));root.addView(cinemaExit,exitParams);cinemaExit.setVisibility(View.GONE);
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view,insets)-> {
            topInset=insets.getSystemWindowInsetTop();bottomInset=insets.getSystemWindowInsetBottom();
            leftInset=insets.getSystemWindowInsetLeft();rightInset=insets.getSystemWindowInsetRight();
            if(Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null) {
                topInset=Math.max(topInset,insets.getDisplayCutout().getSafeInsetTop());
                leftInset=Math.max(leftInset,insets.getDisplayCutout().getSafeInsetLeft());
                rightInset=Math.max(rightInset,insets.getDisplayCutout().getSafeInsetRight());
            }
            layoutPanels();return insets;
        });
        root.requestApplyInsets();updateTheme();layoutPanels();
    }

    private void makeHeader() {
        header=new LinearLayout(this);header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(22),dp(17),dp(22),dp(18));
        header.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,new int[]{0xF0080B16,0xC0080B16,0x00080B16}));
        LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout titleBlock=new LinearLayout(this);titleBlock.setOrientation(LinearLayout.VERTICAL);
        TextView eyebrow=text("INTERACTIVE LIGHT STUDY",10,MUTED);eyebrow.setLetterSpacing(.15f);titleBlock.addView(eyebrow);
        TextView title=text("NEON RIFT",29,WHITE);title.setTypeface(Typeface.create("sans-serif-light",Typeface.NORMAL));title.setLetterSpacing(.14f);
        titleBlock.addView(title);row.addView(titleBlock,new LinearLayout.LayoutParams(0,-2,1));
        Button help=button("?",v->showHelp());help.setTextSize(19);help.setContentDescription("Instructions and graphics information");
        row.addView(help,new LinearLayout.LayoutParams(dp(44),dp(44)));header.addView(row);
        status=text("Starting native renderer…",10,MUTED);status.setPadding(0,dp(8),0,0);header.addView(status);
        root.addView(header,new FrameLayout.LayoutParams(-1,-2,Gravity.TOP));
    }

    private void makeControls() {
        panelScroll=new ScrollView(this);panelScroll.setFillViewport(false);panelScroll.setClipToPadding(false);
        panelScroll.setVerticalScrollBarEnabled(false);panelScroll.setOverScrollMode(View.OVER_SCROLL_NEVER);
        panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16),dp(15),dp(16),dp(13));panel.setBackground(shape(0xEF101727,0xFF2A354B,24));
        LinearLayout labelRow=new LinearLayout(this);labelRow.setGravity(Gravity.CENTER_VERTICAL);
        subtitle=text("NEON / ORIGINAL SPECTRUM",10,ACCENT);subtitle.setLetterSpacing(.10f);
        labelRow.addView(subtitle,new LinearLayout.LayoutParams(0,-2,1));
        Button full=button("CINEMA",v->setCinema(true));full.setTextSize(10);full.setContentDescription("Hide interface for full-screen viewing");
        labelRow.addView(full,new LinearLayout.LayoutParams(dp(84),dp(36)));panel.addView(labelRow);
        LinearLayout palette=new LinearLayout(this);themes=new Button[4];
        for(int i=0;i<4;i++) {
            final int theme=i;themes[i]=button(THEMES[i],v->{settings.theme=theme;updateTheme();save();});
            themes[i].setTextSize(10);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(43),1);
            p.setMargins(i==0?0:dp(5),dp(10),0,dp(10));palette.addView(themes[i],p);
        }
        panel.addView(palette);
        LinearLayout actions=new LinearLayout(this);
        pause=button(settings.paused?"RESUME":"PAUSE",v->{settings.paused=!settings.paused;pause.setText(settings.paused?"RESUME":"PAUSE");});
        Button shuffle=button("RESHAPE",v->rift.shuffle());
        tune=button("TUNE +",v->{expanded=!expanded;tuning.setVisibility(expanded?View.VISIBLE:View.GONE);tune.setText(expanded?"TUNE −":"TUNE +");layoutPanels();});
        Button[] buttons={pause,shuffle,tune};
        for(int i=0;i<buttons.length;i++) {
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(43),1);if(i>0)p.leftMargin=dp(7);
            actions.addView(buttons[i],p);
        }
        panel.addView(actions);tuning=new LinearLayout(this);tuning.setOrientation(LinearLayout.VERTICAL);
        tuning.setPadding(0,dp(15),0,0);tuning.setVisibility(View.GONE);
        addSlider("Motion",.15f,2f,settings.speed,value->settings.speed=value,"×");
        addSlider("Glow",.25f,1.8f,settings.glow,value->settings.glow=value,"×");
        addSlider("Turbulence",0f,2f,settings.turbulence,value->settings.turbulence=value,"×");
        addSlider("Droplets",12,40,settings.count,value->settings.count=Math.round(value),"");
        TextView qualityTitle=text("RENDER QUALITY",10,MUTED);qualityTitle.setPadding(0,dp(10),0,dp(8));tuning.addView(qualityTitle);
        LinearLayout qualities=new LinearLayout(this);Button[] qualityButtons=new Button[3];String[] names={"ECO · 30","BALANCED","ULTRA"};
        for(int i=0;i<3;i++) {
            final int quality=i;
            qualityButtons[i]=button(names[i],v->{settings.quality=quality;rift.applyQuality();save();for(int k=0;k<3;k++)styleSelection(qualityButtons[k],k==quality);});
            qualityButtons[i].setTextSize(10);styleSelection(qualityButtons[i],i==settings.quality);
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(42),1);if(i>0)p.leftMargin=dp(6);qualities.addView(qualityButtons[i],p);
        }
        tuning.addView(qualities);
        TextView note=text("Ultra increases GPU load. Eco limits rendering to 30 fps.\nMotion uses elapsed time, not frame count.",10,MUTED);
        note.setPadding(0,dp(10),0,dp(2));tuning.addView(note);panel.addView(tuning);
        TextView hint=text("DRAG TO ATTRACT   ·   PINCH TO ZOOM   ·   DOUBLE TAP TO PULSE",8,MUTED);
        hint.setGravity(Gravity.CENTER);hint.setPadding(0,dp(14),0,0);panel.addView(hint);
        panelScroll.addView(panel,new ScrollView.LayoutParams(-1,-2));
        FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);p.setMargins(dp(14),0,dp(14),dp(18));
        root.addView(panelScroll,p);
    }

    private interface FloatSetter {void set(float value);}
    private void addSlider(String name,float low,float high,float initial,FloatSetter setter,String suffix) {
        LinearLayout title=new LinearLayout(this);TextView label=text(name,12,WHITE);TextView value=text("",11,MUTED);
        value.setGravity(Gravity.END);title.addView(label,new LinearLayout.LayoutParams(0,-2,1));title.addView(value);
        tuning.addView(title);SeekBar seek=new SeekBar(this);seek.setMax(1000);
        seek.setProgress(Math.round((initial-low)/(high-low)*1000));seek.setProgressTintList(ColorStateList.valueOf(ACCENT));
        seek.setThumbTintList(ColorStateList.valueOf(ACCENT));
        value.setText(formatValue(initial,suffix));
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar bar,int progress,boolean fromUser) {
                float v=low+(high-low)*progress/1000f;setter.set(v);value.setText(formatValue(v,suffix));
            }
            @Override public void onStartTrackingTouch(SeekBar bar) {}
            @Override public void onStopTrackingTouch(SeekBar bar) {save();}
        });
        seek.setContentDescription(name);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(39));p.bottomMargin=dp(8);tuning.addView(seek,p);
    }
    private String formatValue(float value,String suffix) {
        return suffix.isEmpty()?Integer.toString(Math.round(value)):String.format(Locale.US,"%.2f%s",value,suffix);
    }
    private void updateTheme() {
        String[] names={"ORIGINAL SPECTRUM","POLAR LIGHT","SOLAR PLASMA","DEEP SPACE"};
        for(int i=0;i<4;i++)styleSelection(themes[i],i==settings.theme);
        subtitle.setText(THEMES[settings.theme]+" / "+names[settings.theme]);
    }
    private void styleSelection(Button button,boolean selected) {
        button.setTextColor(selected?0xFFDDFFC7:MUTED);
        button.setBackground(shape(selected?0xFF26382D:0xFF192235,selected?0xFF749E60:0xFF2D384F,12));
        button.setSelected(selected);
    }
    private Button button(String title,View.OnClickListener click) {
        Button b=new Button(this);b.setText(title);b.setTextColor(WHITE);b.setTextSize(11);b.setAllCaps(false);
        b.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));b.setLetterSpacing(.025f);
        b.setMinWidth(0);b.setMinimumWidth(0);b.setMinHeight(0);b.setMinimumHeight(0);b.setPadding(dp(5),0,dp(5),0);
        b.setBackground(shape(0xFF192235,0xFF2D384F,12));b.setStateListAnimator(null);b.setOnClickListener(click);return b;
    }
    private TextView text(String message,float size,int color) {
        TextView t=new TextView(this);t.setText(message);t.setTextSize(size);t.setTextColor(color);
        t.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));t.setFontFeatureSettings("kern");return t;
    }
    private GradientDrawable shape(int color,int stroke,int radius) {
        GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));d.setStroke(dp(1),stroke);return d;
    }
    private void setCinema(boolean value) {
        cinema=value;header.setVisibility(cinema?View.GONE:View.VISIBLE);panelScroll.setVisibility(cinema?View.GONE:View.VISIBLE);
        cinemaExit.setVisibility(cinema?View.VISIBLE:View.GONE);
        int flags=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
        if(cinema)flags|=View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }
    private void layoutPanels() {
        if(root==null)return;
        FrameLayout.LayoutParams hp=(FrameLayout.LayoutParams)header.getLayoutParams();
        hp.topMargin=topInset;hp.leftMargin=leftInset;hp.rightMargin=rightInset;header.setLayoutParams(hp);
        FrameLayout.LayoutParams pp=(FrameLayout.LayoutParams)panelScroll.getLayoutParams();
        pp.leftMargin=dp(14)+leftInset;pp.rightMargin=dp(14)+rightInset;pp.bottomMargin=dp(14)+bottomInset;
        int displayHeight=getResources().getDisplayMetrics().heightPixels;
        int available=Math.max(dp(130),displayHeight-topInset-bottomInset-dp(130));
        pp.height=expanded?Math.min(dp(575),available):-2;
        if(getResources().getConfiguration().orientation==Configuration.ORIENTATION_LANDSCAPE) {
            pp.width=dp(350);pp.gravity=Gravity.BOTTOM|Gravity.END;
            if(!expanded)pp.height=Math.min(dp(195),available);
        } else {pp.width=-1;pp.gravity=Gravity.BOTTOM;}
        panelScroll.setLayoutParams(pp);
        FrameLayout.LayoutParams ep=(FrameLayout.LayoutParams)cinemaExit.getLayoutParams();
        ep.bottomMargin=dp(20)+bottomInset;ep.rightMargin=dp(18)+rightInset;cinemaExit.setLayoutParams(ep);
    }
    private void showHelp() {
        new AlertDialog.Builder(this).setTitle("Neon Rift")
            .setMessage("Drag one finger to attract the liquid-like shapes. Pinch with two fingers to zoom. Double tap to send a gentle pulse through them.\n\nPause freezes animation. Reshape creates a new arrangement. Tune adjusts motion, glow, turbulence, density, and quality. Cinema hides most controls.\n\nThis is a procedural visual playground, not a fluid-physics solver or an idle game. Settings save automatically. No network, accounts, ads, or permissions.\n\nRenderer: "+gpu+"\nNative Java + OpenGL ES 3.0\nDevelopment version 0.1.0")
            .setPositiveButton("Explore",null).show();
    }
    @Override public void onReady(String renderer) {
        gpu=renderer;runOnUiThread(()->{if(!isFinishing())status.setText("LIVE  ·  OPENGL ES 3  ·  INITIALIZING FPS");});
    }
    @Override public void onStats(float fps,int width,int height) {
        runOnUiThread(()->{if(!isFinishing())status.setText(String.format(Locale.US,"%s  ·  %.0f FPS  ·  %d × %d  ·  %d DROPLETS",settings.paused?"PAUSED":"LIVE",fps,width,height,settings.count));});
    }
    @Override public void onFailure(String message) {
        runOnUiThread(()->{
            if(isFinishing()||errorShown)return;errorShown=true;status.setText("RENDERER ERROR");
            String report="Neon Rift 0.1.0\nAndroid "+Build.VERSION.RELEASE+"\nDevice: "+Build.MANUFACTURER+" "+Build.MODEL+"\nGPU: "+gpu+"\n"+message;
            new AlertDialog.Builder(this).setTitle("Graphics initialization failed")
                .setMessage("The renderer could not start. Copy the report so the actual error can be fixed.\n\n"+report)
                .setPositiveButton("Copy report",(dialog,which)->{ClipboardManager clipboard=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);if(clipboard!=null)clipboard.setPrimaryClip(ClipData.newPlainText("Neon Rift error",report));})
                .setNegativeButton("Close",(dialog,which)->finish()).show();
        });
    }
    private void save() {if(preferences!=null)settings.save(preferences);}
    @Override protected void onPause() {save();if(rift!=null)rift.onPause();super.onPause();}
    @Override protected void onResume() {super.onResume();if(rift!=null){rift.onResume();rift.resetClock();}}
    @Override protected void onSaveInstanceState(Bundle out) {out.putBoolean("paused",settings.paused);save();super.onSaveInstanceState(out);}
    @Override public void onConfigurationChanged(Configuration configuration) {super.onConfigurationChanged(configuration);layoutPanels();}
    @Override public void onBackPressed() {
        if(cinema)setCinema(false);else if(expanded){expanded=false;tuning.setVisibility(View.GONE);tune.setText("TUNE +");layoutPanels();}else super.onBackPressed();
    }
    private int dp(float x) {return Math.round(x*getResources().getDisplayMetrics().density);}
}
