// Ripped from Lume v2, commit 99c1276

import type { DeepPartial, Site } from "lume/core.ts";
import { merge, read } from "lume/core/utils.ts";
import { Page } from "lume/core/filesystem.ts";

import { createGenerator, presetUno, resetUrl } from "../deps/unocss.ts";
import type { UserConfig } from "../deps/unocss.ts";

export interface Options {
  /**
   * Configurations for UnoCSS.
   * @see {@link https://unocss.dev/guide/config-file}
   */
  config?: UserConfig;
  /**
   * Set the css filename for all generated styles,
   * Set to `false` to insert a <style> tag per page.
   * @defaultValue `false`
   */
  cssFile: false | string;
  /**
   * Supported CSS reset options.
   * @see {@link https://github.com/unocss/unocss/tree/main/packages/reset}
   * @defaultValue `tailwind`
   */
  reset: false | "tailwind" | "tailwind-compat" | "eric-meyer";
}

export const defaults: Options = {
  config: {
    presets: [presetUno()],
  },
  cssFile: false,
  reset: "tailwind",
};

export default function (userOptions: DeepPartial<Options> = {}) {
  const options = merge(defaults, userOptions) as Options;

  return (site: Site) => {
    const uno = createGenerator(options.config);

    if (options.cssFile === false) {
      // Insert a <style> tag for each page
      site.processAll([".html"], async (pages) => {
        const reset = await getResetCss(options);

        await Promise.all(
          pages.map(async (page) => {
            const document = page.document!;
            const result = await uno.generate(
              document.documentElement?.innerHTML ?? ""
            );
            const css = reset ? `${reset}\n${result.css}` : result.css;

            if (css) {
              const style = document.createElement("style");
              style.innerText = css;
              page.document?.head?.appendChild(style);
            }
          })
        );
      });
      return;
    }

    // Generate the stylesheets for all pages
    site.processAll([".html"], async (pages) => {
      const classes = new Set<string>();

      await Promise.all(
        pages.map(
          async (page) =>
            await uno
              .generate(page.document?.documentElement?.innerHTML ?? "")
              .then((res) => res.matched)
              .then((matched) => matched.forEach((match) => classes.add(match)))
        )
      );

      // Create & merge stylesheets for all pages
      const reset = await getResetCss(options);
      const result = await uno.generate(classes);
      const css = reset ? `${reset}\n${result.css}` : result.css;

      // output css as a page
      const exists = site.pages.find(
        (page) => page.outputPath === options.cssFile
      );

      if (exists) {
        exists.content += `\n${css}`;
      } else {
        site.pages.push(Page.create(options.cssFile as string, css));
      }
    });
  };
}

/**
 * TODO: Replace with CSS Modules Import
 * @remarks Deno does not currently support CSS Modules.
 * @see {@link https://github.com/denoland/deno/issues/11961}
 */
async function getResetCss(options: Options) {
  return options.reset === false
    ? ""
    : await read(`${resetUrl}/${options.reset}.css`, false);
}
