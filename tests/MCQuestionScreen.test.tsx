import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { curriculum } from "@/lib/curriculum";

describe("MCQuestionScreen Back button", () => {
  it("does not render Back when no onBack is provided", () => {
    render(<MCQuestionScreen mcq={curriculum.mcq1} onAnswer={() => {}} />);
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("invokes onBack when clicked with no option selected", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onAnswer = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={onAnswer}
        onBack={onBack}
      />,
    );

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("invokes onBack regardless of selection (does not submit)", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onAnswer = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={onAnswer}
        onBack={onBack}
      />,
    );

    const radios = screen.getAllByRole("radio");
    await user.click(radios[0]);
    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
