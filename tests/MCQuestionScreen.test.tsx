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

describe("MCQuestionScreen wrong-answer inline flow", () => {
  it("renders remediation text inline when a wrong option is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByText(wrong.remediation as string, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("calls onWrongAttempt with the chosen option and does NOT call onAnswer", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const onWrongAttempt = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={onAnswer}
        onWrongAttempt={onWrongAttempt}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onWrongAttempt).toHaveBeenCalledTimes(1);
    expect(onWrongAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ id: wrong.id }),
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("disables radios after a wrong submit until Try again is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: /try again/i }));

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeDisabled();
    }
    expect(
      screen.queryByText(wrong.remediation as string, { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("renders Ask a follow-up only when the wrong option has a misconceptionTag", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const taggedWrong = curriculum.mcq1.options.find(
      (o) => !o.isCorrect && o.misconceptionTag,
    )!;
    await user.click(screen.getByLabelText(taggedWrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByRole("button", { name: /ask a follow-up/i }),
    ).toBeInTheDocument();
  });

  it("keeps Back visible after a wrong submit", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
        onBack={onBack}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    const backBtn = screen.getByRole("button", { name: /back/i });
    await user.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("MCQuestionScreen correct-answer inline flow", () => {
  it("renders the MCQ's rationale and a Next button when correct is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByText(curriculum.mcq1.rationale, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT call onAnswer on the Submit click; calls it only on Next", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={onAnswer}
        onWrongAttempt={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onAnswer).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: correct.id, isCorrect: true }),
    );
  });

  it("hides Back after a correct submit", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
        onBack={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.queryByRole("button", { name: /back/i }),
    ).not.toBeInTheDocument();
  });
});
