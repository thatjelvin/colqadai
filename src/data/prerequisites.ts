/**
 * Prerequisite relationships between math subtopics.
 *
 * Keys are subtopic slugs; values are arrays of prerequisite subtopic slugs.
 * A student should have mastery of all prerequisites before attempting a topic.
 *
 * Based on standard university math curriculum sequencing.
 */

export const PREREQUISITES: Record<string, string[]> = {
  // Calculus chain
  "differential-calculus": ["limits-continuity"],
  "integral-calculus": ["differential-calculus"],
  "multivariable-calculus": ["integral-calculus"],
  "series-sequences": ["integral-calculus"],

  // Linear Algebra (largely independent, but vectors come first)
  "matrices-determinants": ["vectors-vector-spaces"],
  "linear-transformations": ["matrices-determinants"],
  "eigenvalues-eigenvectors": ["linear-transformations"],
  "inner-product-spaces": ["linear-transformations"],

  // Differential Equations (requires calculus + some linear algebra)
  "second-order-odes": ["first-order-odes"],
  "systems-of-odes": ["second-order-odes", "matrices-determinants"],
  "laplace-transforms": ["second-order-odes"],
  "intro-to-pdes": ["laplace-transforms"],

  // Statistics & Probability chain
  "probability-theory": ["descriptive-statistics"],
  "distributions": ["probability-theory"],
  "hypothesis-testing": ["distributions"],
  "bayesian-statistics": ["probability-theory"],
  "regression-analysis": ["descriptive-statistics", "probability-theory"],

  // Real Analysis (requires calculus)
  "limits-continuity-rigorous": ["limits-continuity"],
  "differentiation": ["limits-continuity-rigorous"],
  "integration": ["differentiation"],
  "metric-spaces": ["limits-continuity-rigorous"],

  // Numerical Methods (requires calculus + linear algebra)
  "interpolation": ["root-finding"],
  "numerical-integration": ["interpolation"],
  "ode-solvers": ["numerical-integration", "first-order-odes"],
  "numerical-linear-systems": ["matrices-determinants"],

  // Optimization (requires calculus + linear algebra)
  "constrained": ["unconstrained"],
  "linear-programming": ["matrices-determinants"],
  "convex": ["unconstrained"],
  "gradient-descent": ["unconstrained", "partial-derivatives-for-ml"],

  // Financial Mathematics
  "interest-annuities": ["time-value-of-money"],
  "portfolio-theory": ["probability-theory"],
  "options-derivatives": ["portfolio-theory"],
  "risk-return": ["portfolio-theory"],

  // Econometrics
  "ols-assumptions": ["simple-multiple-regression"],
  "hypothesis-testing-in-regression": ["ols-assumptions"],
  "panel-data": ["simple-multiple-regression"],
  "time-series": ["simple-multiple-regression"],

  // ML Mathematics
  "probability-for-ml": ["probability-theory"],
  "calculus-for-backpropagation": ["differential-calculus"],
  "loss-functions-optimization": ["calculus-for-backpropagation", "linear-algebra-for-ml"],
  "bayesian-inference": ["probability-for-ml"],

  // Abstract Algebra (requires discrete math)
  "rings-fields": ["groups"],
  "homomorphisms": ["groups", "rings-fields"],
  "permutations": ["groups"],
  "applications-in-cryptography": ["number-theory", "groups"],

  // Information Theory (requires probability + discrete math)
  "data-compression": ["entropy-information"],
  "channel-capacity": ["entropy-information"],
  "coding-theory": ["data-compression"],
  "kl-divergence": ["entropy-information", "probability-theory"],
};

/**
 * Get all prerequisite slugs for a given topic slug.
 * Returns empty array if no prerequisites exist.
 */
export function getPrerequisiteSlugs(topicSlug: string): string[] {
  return PREREQUISITES[topicSlug] ?? [];
}
