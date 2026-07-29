export class PossiblePhiError extends Error {
  constructor(message = "This text may contain patient information.") {
    super(message);
    this.name = "PossiblePhiError";
  }
}

export class UnsupportedProcedureError extends Error {
  constructor(message = "This procedure is outside the supported MVP scope.") {
    super(message);
    this.name = "UnsupportedProcedureError";
  }
}

export class ExtractionValidationError extends Error {
  constructor(message = "Extraction output did not pass validation.") {
    super(message);
    this.name = "ExtractionValidationError";
  }
}

export class ModelProviderError extends Error {
  constructor(message = "The configured model provider failed.") {
    super(message);
    this.name = "ModelProviderError";
  }
}
