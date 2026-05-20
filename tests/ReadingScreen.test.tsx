import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingScreen } from "@/components/ReadingScreen";
import { curriculum } from "@/lib/curriculum";

describe("ReadingScreen Back button", () => {
  it("does not render Back when no onBack is provided", () => {
    render(
      <ReadingScreen section={curriculum.reading1} onAdvance={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("renders Back when onBack is provided and invokes it on click", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ReadingScreen
        section={curriculum.reading1}
        onAdvance={() => {}}
        onBack={onBack}
      />,
    );

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
