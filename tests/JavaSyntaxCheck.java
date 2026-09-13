import com.sun.source.util.JavacTask;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

/** Parser-only check, NOT an Android compile or SDK type check. */
public final class JavaSyntaxCheck {
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> errors=new DiagnosticCollector<>();
        try(StandardJavaFileManager fm=compiler.getStandardFileManager(errors,null,null)) {
            List<File> paths=new ArrayList<>();for(String p:args)paths.add(new File(p));
            JavacTask task=(JavacTask)compiler.getTask(null,fm,errors,null,null,fm.getJavaFileObjectsFromFiles(paths));
            task.parse();
            for(Diagnostic<?> error:errors.getDiagnostics()) {
                if(error.getKind()==Diagnostic.Kind.ERROR)throw new AssertionError(error.toString());
            }
            System.out.println("PASS: Java syntax parsing for "+paths.size()+" source files. Android SDK type checking has NOT run.");
        }
    }
}
