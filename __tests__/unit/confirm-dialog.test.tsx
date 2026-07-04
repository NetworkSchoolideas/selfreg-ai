import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

function findButtons(element: React.ReactNode): React.ReactElement[] {
  if (!React.isValidElement(element)) return [];
  const props = element.props as { children?: React.ReactNode };
  const own = element.type === "button" ? [element] : [];
  return own.concat(React.Children.toArray(props.children).flatMap(findButtons));
}

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    const result = ConfirmDialog({
      isOpen: false,
      title: "Delete session",
      message: "Are you sure?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    });

    expect(result).toBeNull();
  });

  it("renders dialog copy and wires confirm/cancel handlers", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const element = ConfirmDialog({
      isOpen: true,
      title: "Delete session",
      message: "Are you sure?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
      onConfirm,
      onCancel,
    }) as React.ReactElement;

    const html = renderToStaticMarkup(element);
    expect(html).toContain("Delete session");
    expect(html).toContain("Are you sure?");

    const buttons = findButtons(element);
    const cancelButton = buttons.find((button) => button.props.children === "Cancel");
    const confirmButton = buttons.find((button) => button.props.children === "Delete");

    cancelButton?.props.onClick();
    confirmButton?.props.onClick();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
