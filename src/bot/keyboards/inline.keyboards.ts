import { Markup } from "telegraf";

export const compileKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("Compile Now", "compile_now")],
    [Markup.button.callback("Deploy Now", "deploy_now")],
  ]);

export const deployKeyboard = (contractAddress: string) =>
  Markup.inlineKeyboard([
    [Markup.button.callback("Open contract interaction", `interact_${contractAddress}`)],
  ]);

export const interactionKeyboard = (commands: Array<{ label: string; data: string }>) =>
  Markup.inlineKeyboard(
    commands.map((command) => [Markup.button.callback(command.label, command.data)]),
  );
