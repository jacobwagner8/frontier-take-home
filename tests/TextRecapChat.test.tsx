import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextRecapChat } from "@/components/TextRecapChat";

describe("TextRecapChat Back button", () => {
  it("does not render Back when no onBack is provided", () => {
    render(<TextRecapChat onDone={() => {}} />);
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("invokes onBack on click and does not invoke onDone", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onDone = vi.fn();
    render(<TextRecapChat onDone={onDone} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });
});
