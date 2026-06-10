import { compileFunc, arraySourceResolver } from "@ton-community/func-js";
import { Cell, beginCell, contractAddress } from "ton-core";
import { saveTempFile, removeTempFile } from "../utils/file-system.js";
import { logCompileError } from "../utils/compile-error-logger.js";

export interface CompileResult {
  boc: string;
  fift: string;
  abi: Record<string, unknown>;
  address: string;
  wasAutoCorrected?: boolean;
  correctedSource?: string;
}

export class CompilerService {
  async compileSource(
    source: string,
    fileName: string,
    extraSources: Array<{ filename: string; content: string }> = [],
  ): Promise<CompileResult> {
    const normalizedName = fileName.toLowerCase();
    const isFunC = normalizedName.endsWith(".fc") || normalizedName.endsWith(".func");
    const isTact = normalizedName.endsWith(".tact");

    if (!isFunC && !isTact) {
      throw new Error("Only .fc, .func, or .tact contract files are supported for compilation.");
    }

    const tempPath = await saveTempFile(fileName, source);

    try {
      if (isTact) {
        return this.compileTactSource(source, fileName);
      }

      try {
        return await this.compileFunC(source, fileName, extraSources);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logCompileError({
          fileName,
          error: errorMessage,
          source,
          stage: "raw_compile",
        });

        const correctedSource = this.autoCorrectFunC(source);
        if (correctedSource !== source) {
          await logCompileError({
            fileName,
            error: "Attempting auto-correct based on compile failure.",
            source,
            correctedSource,
            stage: "autocorrect_attempt",
          });

          try {
            const compiled = await this.compileFunC(correctedSource, fileName, extraSources);
            return {
              ...compiled,
              wasAutoCorrected: true,
              correctedSource,
            };
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
            await logCompileError({
              fileName,
              error: retryMessage,
              source: correctedSource,
              stage: "autocorrect_failed",
            });
          }
        }

        throw new Error(errorMessage);
      }
    } finally {
      await removeTempFile(tempPath);
    }
  }

  private async compileFunC(
    source: string,
    fileName: string,
    extraSources: Array<{ filename: string; content: string }> = [],
  ): Promise<CompileResult> {
    const sourceList = [{ filename: fileName, content: source }, ...extraSources];
    const result = await compileFunc({
      sources: arraySourceResolver(sourceList),
      targets: [fileName],
      optLevel: 2,
      debugInfo: true,
    });

    if (result.status === "error") {
      throw new Error(`Compiler error: ${result.message}`);
    }

    const codeCell = Cell.fromBase64(result.codeBoc);
    const initDataCell = beginCell().endCell();
    const address = contractAddress(0, {
      code: codeCell,
      data: initDataCell,
    }).toString();

    return {
      boc: result.codeBoc,
      fift: result.fiftCode,
      abi: {
        warnings: result.warnings,
        debugInfo: result.debugInfo ?? {},
      },
      address,
    };
  }

  private autoCorrectFunC(source: string): string {
    const fixedBraces = this.fixUnmatchedBraces(source);
    const semicolonsAdded = this.fixMissingSemicolons(fixedBraces);
    return semicolonsAdded;
  }

  private fixUnmatchedBraces(source: string): string {
    const openBraces = (source.match(/{/g) || []).length;
    const closeBraces = (source.match(/}/g) || []).length;
    const openParens = (source.match(/\(/g) || []).length;
    const closeParens = (source.match(/\)/g) || []).length;

    let corrected = source;
    if (openBraces > closeBraces) {
      corrected += "\n" + "}".repeat(openBraces - closeBraces);
    }
    if (openParens > closeParens) {
      corrected += ")".repeat(openParens - closeParens);
    }
    return corrected;
  }

  private fixMissingSemicolons(source: string): string {
    const lines = source.split("\n");
    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (
          !trimmed ||
          trimmed.endsWith(";") ||
          trimmed.endsWith("{") ||
          trimmed.endsWith("}") ||
          trimmed.endsWith(":") ||
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*") ||
          /^\s*(func|if|else|while|for|switch|pragma|extern|import|return|break|continue|throw|case|default)\b/.test(trimmed)
        ) {
          return line;
        }

        if (/(=|\)|\]|"|'|\+|-|\*|\/)$/.test(trimmed)) {
          return `${line};`;
        }

        return line;
      })
      .join("\n");
  }

  private async compileTactSource(source: string, fileName: string): Promise<CompileResult> {
    const codeCell = beginCell().storeBuffer(Buffer.from(source, "utf8")).endCell();
    const codeBoc = codeCell.toBoc({ idx: false, crc32: false }).toString("base64");
    const initDataCell = beginCell().endCell();
    const address = contractAddress(0, {
      code: codeCell,
      data: initDataCell,
    }).toString();

    return {
      boc: codeBoc,
      fift: `// Placeholder Tact compilation output for ${fileName}`,
      abi: {
        placeholder: true,
        message: "Tact compilation is currently handled as a compatibility stub. Replace this with a native Tact compiler for production.",
      },
      address,
    };
  }
}
