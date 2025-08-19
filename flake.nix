{
  description = "GeekCalendar flake (dev shell + run app)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        node = pkgs.nodejs_20;
        runScript = pkgs.writeShellScriptBin "geekcalendar-run" ''
          exec ${node}/bin/npm start --loglevel=info "$@"
        '';
        geekcalendarPkg = pkgs.buildNpmPackage {
          pname = "geekcalendar";
          version = (builtins.fromJSON (builtins.readFile ./package.json)).version or "0.0.0";
          src = ./.;
          npmDepsHash = "sha256-Pru0JVGIFeG550gFYBxeXMpdXs/JaBg5yd6/SqrI/6c=";
          nodejs = node;
          dontNpmBuild = true; # no build step, CLI app
          meta = with pkgs.lib; {
            description = "TUI calendar application built with Ink";
            homepage = "https://github.com/fearlessgeekmedia/geekcalendar";
            license = licenses.mit;
            mainProgram = "geekcalendar";
            platforms = platforms.all;
          };
        };
      in
      {
        packages.default = geekcalendarPkg;
        packages.geekcalendar = geekcalendarPkg;

        devShells.default = pkgs.mkShell {
          packages = [
            node
            pkgs.git
            pkgs.cacert
          ];
          shellHook = ''
            echo "Dev shell ready: node $(node -v), npm $(npm -v)"
            echo "Run: npm install && npm start"
          '';
        };

        apps.default = self.apps.${system}.run;
        apps.run = {
          type = "app";
          program = "${runScript}/bin/geekcalendar-run";
        };
        apps.geekcalendar = {
          type = "app";
          program = "${geekcalendarPkg}/bin/geekcalendar";
        };

        formatter = pkgs.alejandra;
      });
}
