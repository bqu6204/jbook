import * as esbuild from "esbuild-wasm";

// NPM REGISTER:
// We can download modules from npm register through the given URL from command line 'npm veiw <package_name> dist.tarball'
// 'npm view <package_name>' shows the information of the package,
// and dist.tarball is a given URL to download the tarball of the package.

// UNPKG :
// unpkg (unpackage) is an alternative solution to downloading files from npm register.
// which is a cdn(content delivery network) for all modules/packages in npm, loading files through URL.
// usage: unpkg.com/ <package_name@version> / <file>
// eg. unpkg.com/react@18.0.2
//     unpkg.com/react@18.0.2/umd/react.production.min.js

export const unpkgPathPlugin = () => {
  return {
    // just for debug purposes
    name: "unpkg-path-plugin",

    // !!!IMPORTANT
    // This setup function will be automatically called by ESBuild,
    // with a single argument (which in here we called "build").
    // This "build" argument represents the bundling process.
    //    ( the entire process of finding some files, loading them up, parsing them,
    //      transpiling them,and joining a bunch of files together)
    // SO, we can interact( or overwrite) certain parts of bundling process by working with this build argument.
    setup(build: esbuild.PluginBuild) {
      // filter determines which type of file(.js, .ts) events will runb
      // onReslve step: ESBuild try to figure out WHERE the index.js file is stored, which we have to overwrite( cause the file doesn't really exist).

      // Handle root entry file 'index.js'
      build.onResolve({ filter: /(^index\.js$)/ }, () => {
        return { path: "index.js", namespace: "a" };
      });

      // Handle relative paths in a module
      build.onResolve({ filter: /^\.+\// }, (args: any) => {
        return {
          namespace: "a",
          // instanse of URL contains host, hostname, href, pathname.....
          path: new URL(args.path, "https://unpkg.com" + args.resolveDir + "/")
            .href,
        };
      });

      // Handle main file of a module
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        return {
          namespace: "a",
          path: `https://unpkg.com/${args.path}`,
        };
      });
    },
  };
};
