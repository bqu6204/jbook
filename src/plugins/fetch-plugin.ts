import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localForage from "localforage";

const fileCache = localForage.createInstance({
  name: "filecache",
});

export const fetchPlugin = (inputCode: string) => {
  return {
    name: "fetch-plugin",
    setup(build: esbuild.PluginBuild) {
      // onLoad step: ESBuild attempt to load up the file(get the content of the file)
      build.onLoad({ filter: /(^index\.js)/ }, () => {
        return {
          loader: "jsx",
          // this 'contents' is the imaginary 'index.js' file(the entry point of ESBuildService) with import
          contents: inputCode,
        };
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
        /*** CACHE ***/
        // Check to see if we have already fetched this file
        // and if it is in the cache ,return it immediately :

        const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
          args.path
        );
        if (cachedResult) return cachedResult;
      });

      build.onLoad({ filter: /.css$/ }, async (args: any) => {
        /*** FETCH ***/
        //request is an XMLHttpRequest object with response, responseText, responseURL...
        const { data, request } = await axios.get(args.path);
        const escaped = data
          .replace(/\n/g, "")
          .replace(/"/g, '\\"')
          .replace(/'/g, "\\'");
        const contents = `
              const style = document.createElement('style');
              style.innerText = '${escaped}';
              document.head.appendChild(style);`;
        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents,
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        // store response in cache
        await fileCache.setItem(args.path, result);

        return result;
      });

      build.onLoad(
        { filter: /.*/ /* ,namespace: '***' */ },
        async (args: any) => {
          /*** FETCH ***/
          //request is an XMLHttpRequest object with response, responseText, responseURL...
          const { data, request } = await axios.get(args.path);

          const result: esbuild.OnLoadResult = {
            loader: "jsx",
            contents: data,
            resolveDir: new URL("./", request.responseURL).pathname,
          };

          // store response in cache
          await fileCache.setItem(args.path, result);

          return result;
        }
      );
    },
  };
};
