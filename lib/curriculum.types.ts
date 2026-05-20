export interface ReadingSection {
  id: string;
  title: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
}

export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
  /** Remediation shown if this option is selected and it is wrong. */
  remediation?: string;
  /** Tag categorizing the misconception, used in tutor prompt + chat context. */
  misconceptionTag?: string;
}

export interface MCQ {
  id: string;
  prompt: string;
  options: MCQOption[];
}

export interface Curriculum {
  reading1: ReadingSection;
  mcq1: MCQ;
  mcq1b: MCQ;
  mcq1c: MCQ;
  simulationCaptions: {
    oneBond: string;
    twoBond: {
      mechanism: string;
      consequence: string;
      hazard: string;
    };
  };
  mcq2: MCQ;
  voiceTutor: {
    /** Verbatim summary the tutor must use as ground truth. */
    groundingFacts: string[];
    /** Suggested opening prompt the tutor uses. */
    openingPrompt: string;
  };
}
