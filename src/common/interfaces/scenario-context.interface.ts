/**
 * Context for the sales scenario (product, deal, conditions).
 */
export interface ScenarioContext {
  product: string;
  dealDetails: string;
  specialConditions?: string;
}
