import * as esbuild from "esbuild-wasm";
import { unpkgPathPlugin } from "./plugins/unpkg-path-plugin";
import { fetchPlugin } from "./plugins/fetch-plugin";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";
import CodeEditor from "./components/code-editor";
import "bulmaswatch/superhero/bulmaswatch.min.css";

const App = () => {
  const [input, setInput] = useState("");
  const iframe = useRef<any>();
  const esbuildService = useRef<any>();

  // service for esbuild, called when component first render on the screen
  const startService = async () => {
    // promise returns a service object, which bundles and transform(transpile) the input code(jsx) to normal JavaScript
    esbuildService.current = await esbuild.startService({
      worker: true,
      // wasmURL: "/esbuild.wasm", // the directory to /public/esbuild.wasm
      wasmURL: "https://unpkg.com/esbuild-wasm@0.8.27/esbuild.wasm",
    });
  };

  useEffect(() => {
    startService();
  }, []);

  const onClick = async () => {
    if (!esbuildService.current) return;

    iframe.current.srcdoc = html;
    /*** NOTE: The code below works if we don't need access to the file system (such as 'import') from the input code ***/
    // const result = await esbuildService.current.transform(input, { // transform simply means transpile
    //   loader: "jsx",
    //   target: "es2015",
    // });

    /*** NOTE: Use the code below if we need access to the file system('such as import') from the input code ***/
    const result = await esbuildService.current.build({
      entryPoints: ["index.js"], // make 'index.js' the first one to be bundled
      bundle: true,
      write: false,
      plugins: [unpkgPathPlugin(), fetchPlugin(input)],
      define: {
        "process.env.NODE_ENV": "'production'", // must add single & double quotes to represent string
        global: "window",
      },
    });

    // setCode(result.outputFiles[0].text);
    iframe.current.contentWindow.postMessage(result.outputFiles[0].text, "*");
  };

  const html = `
  <html>
    <head></head>
    <body>
        <div id='root'></div>
        <script>
            window.addEventListener('message', event=> {
                try{
                    eval(event.data);
                } catch(err) {
                    const root = document.querySelector('#root');
                    root.innerHTML = '<div style="color: red;"><h4>###Runtime Error</h4>' + err +'<div>'
                    console.error(err);
                }   
            },false)
        </script>
    </body>
  </html>
  `;

  return (
    <div>
      <CodeEditor
        initialValue={"const a = 1"}
        onChange={(value) => setInput(value)}
      />
      <textarea
        style={{ minWidth: "500px", minHeight: "150px" }}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
        }}
      ></textarea>
      <div>
        <button onClick={onClick}>Submit</button>
      </div>

      {/* Direct access between frames is allowed when :
            1. the child frame (in this case is <iframe>) DOES NOT have a 'sandbox' property, or has a 'sandebox = "allow-same-origin"' property

            AND

            2. the parent doc and the frame doc has the exact same : DOMAIN, PORT, PROTOCAL(http vs https) 
      */}
      <iframe
        title="preview"
        ref={iframe}
        srcDoc={html}
        sandbox="allow-scripts allow-modals"
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
