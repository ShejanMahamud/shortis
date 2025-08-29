import { NotFoundException } from '@nestjs/common';

export class PlanNotFoundException extends NotFoundException {
  constructor(planId: string) {
    super(`Plan with ID ${planId} not found`);
  }
}
export class PlanFeatureNotFoundException extends NotFoundException {
  constructor(featureId: string) {
    super(`Plan feature with ID ${featureId} not found`);
  }
}
export class PlanFeatureAlreadyExistsException extends NotFoundException {
  constructor(featureName: string) {
    super(`Plan feature with name ${featureName} already exists`);
  }
}
export class PlanAlreadyExistsException extends NotFoundException {
  constructor(planName: string) {
    super(`Plan with name ${planName} already exists`);
  }
}
export class NoFeaturesForPlanException extends NotFoundException {
  constructor(planId: string) {
    super(`No features found for plan with ID ${planId}`);
  }
}
