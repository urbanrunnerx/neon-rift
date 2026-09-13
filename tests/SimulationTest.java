import com.urbanrunnerx.neonrift.RiftSimulation;
import java.io.PrintWriter;

public final class SimulationTest {
    private static int checks;
    private static void check(boolean condition,String message) {
        checks++; if(!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) throws Exception {
        RiftSimulation a=new RiftSimulation(731), b=new RiftSimulation(731);
        for(int i=0;i<160;i++) check(a.balls[i]==b.balls[i],"Seed must be deterministic");
        for(int k=0;k<1000;k++) { a.step(1f/60,.75f); b.step(1f/60,.75f); }
        for(int i=0;i<160;i++) check(a.balls[i]==b.balls[i],"Steps must be deterministic");
        float time=a.time; a.step(Float.NaN,1);a.step(-1,1);a.step(1,0);
        check(time==a.time,"Invalid timestep must not change time");
        a.touch(Float.NaN,0,true);check(!a.touching,"Ignore invalid touch");
        for(int k=0;k<36000;k++) {
            if(k%600==0) a.burst(.25f,-.25f);
            if(k%600==100) a.touch(.8f,-.7f,true);
            if(k%600==250) a.touch(0,0,false);
            a.step(1f/60,2f);
            for(int i=0;i<40;i++) {
                int j=i*4;
                check(Float.isFinite(a.balls[j])&&Math.abs(a.balls[j])<3,"X must be finite/bounded");
                check(Float.isFinite(a.balls[j+1])&&Math.abs(a.balls[j+1])<3,"Y must be finite/bounded");
                check(a.balls[j+2]>.01f&&a.balls[j+2]<.4f,"Radius must be positive/bounded");
            }
        }
        a=new RiftSimulation(731);b=new RiftSimulation(731);
        for(int k=0;k<600;k++)a.step(1f/60,1f);
        for(int k=0;k<300;k++)b.step(1f/30,1f);
        float maxError=0;
        for(int i=0;i<160;i++)maxError=Math.max(maxError,Math.abs(a.balls[i]-b.balls[i]));
        check(maxError<.002,"30/60 fps consistency");
        for(float speed:new float[]{.15f,.75f,1.3f,2f}) {
            RiftSimulation slow=new RiftSimulation(731),fast=new RiftSimulation(731);
            for(int k=0;k<300;k++) {slow.touch(.6f,-.5f,k>=60&&k<180);slow.step(1f/30,speed);}
            for(int k=0;k<600;k++) {fast.touch(.6f,-.5f,k>=120&&k<360);fast.step(1f/60,speed);}
            for(int i=0;i<160;i++)check(Math.abs(slow.balls[i]-fast.balls[i])<.012f,"Touch consistency at speed "+speed);
        }
        a.reset(731);a.step(1f/60,1);a.reset(731);b.reset(731);
        for(int i=0;i<160;i++)check(a.balls[i]==b.balls[i],"Reset must restore initial state");
        if(args.length>0) {
            try(PrintWriter out=new PrintWriter(args[0])) {
                out.println("[");
                for(int frame=0;frame<160;frame++) {
                    if(frame>0)out.println(",");
                    out.print("{\"time\":"+a.time+",\"balls\":[");
                    for(int i=0;i<160;i++) {if(i>0)out.print(',');out.print(a.balls[i]);}
                    out.print("]}");
                    for(int j=0;j<3;j++)a.step(1f/60,.75f);
                }
                out.println("\n]");
            }
        }
        System.out.println("PASS: "+checks+" assertions; deterministic seeding, reset, invalid input, 10-minute stress, 30/60-fps consistency.");
        System.out.println("Maximum 30/60-fps error: "+maxError);
    }
}
