import { generateId, type UIMessage, type UIMessageStreamWriter } from "ai";

export function writeAssistantText<UI_MESSAGE extends UIMessage>(
  writer: UIMessageStreamWriter<UI_MESSAGE>,
  text: string,
): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return;
  }

  const textId = generateId();
  writer.write({ type: "text-start", id: textId });
  writer.write({ type: "text-delta", id: textId, delta: trimmed });
  writer.write({ type: "text-end", id: textId });
}
