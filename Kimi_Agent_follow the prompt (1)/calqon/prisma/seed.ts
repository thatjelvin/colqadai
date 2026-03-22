import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create topics
  const calculus = await prisma.topic.create({
    data: {
      name: "Calculus",
      slug: "calculus",
      description: "Study of continuous change",
      order: 1,
    },
  });

  const linearAlgebra = await prisma.topic.create({
    data: {
      name: "Linear Algebra",
      slug: "linear-algebra",
      description: "Study of vectors, matrices, and linear transformations",
      order: 2,
    },
  });

  const statistics = await prisma.topic.create({
    data: {
      name: "Statistics",
      slug: "statistics",
      description: "Study of data collection, analysis, and interpretation",
      order: 3,
    },
  });

  const discreteMath = await prisma.topic.create({
    data: {
      name: "Discrete Mathematics",
      slug: "discrete-mathematics",
      description: "Study of discrete mathematical structures",
      order: 4,
    },
  });

  const realAnalysis = await prisma.topic.create({
    data: {
      name: "Real Analysis",
      slug: "real-analysis",
      description: "Rigorous study of real numbers and real-valued functions",
      order: 5,
    },
  });

  // Create subtopics for Calculus
  const derivatives = await prisma.topic.create({
    data: {
      name: "Derivatives",
      slug: "derivatives",
      description: "Rates of change and slopes of curves",
      parentId: calculus.id,
      order: 1,
    },
  });

  const integrals = await prisma.topic.create({
    data: {
      name: "Integrals",
      slug: "integrals",
      description: "Accumulation and area under curves",
      parentId: calculus.id,
      order: 2,
    },
  });

  const limits = await prisma.topic.create({
    data: {
      name: "Limits",
      slug: "limits",
      description: "Behavior of functions as inputs approach certain values",
      parentId: calculus.id,
      order: 3,
    },
  });

  // Create subtopics for Linear Algebra
  const matrices = await prisma.topic.create({
    data: {
      name: "Matrices",
      slug: "matrices",
      description: "Rectangular arrays of numbers and operations on them",
      parentId: linearAlgebra.id,
      order: 1,
    },
  });

  const vectors = await prisma.topic.create({
    data: {
      name: "Vectors",
      slug: "vectors",
      description: "Quantities with magnitude and direction",
      parentId: linearAlgebra.id,
      order: 2,
    },
  });

  const eigenvalues = await prisma.topic.create({
    data: {
      name: "Eigenvalues and Eigenvectors",
      slug: "eigenvalues",
      description: "Special vectors that only scale under linear transformations",
      parentId: linearAlgebra.id,
      order: 3,
    },
  });

  // Create subtopics for Statistics
  const probability = await prisma.topic.create({
    data: {
      name: "Probability",
      slug: "probability",
      description: "Study of random events and likelihood",
      parentId: statistics.id,
      order: 1,
    },
  });

  const distributions = await prisma.topic.create({
    data: {
      name: "Distributions",
      slug: "distributions",
      description: "Functions showing possible values and their probabilities",
      parentId: statistics.id,
      order: 2,
    },
  });

  // Create subtopics for Discrete Math
  const combinatorics = await prisma.topic.create({
    data: {
      name: "Combinatorics",
      slug: "combinatorics",
      description: "Study of counting and arrangement",
      parentId: discreteMath.id,
      order: 1,
    },
  });

  const graphTheory = await prisma.topic.create({
    data: {
      name: "Graph Theory",
      slug: "graph-theory",
      description: "Study of graphs and networks",
      parentId: discreteMath.id,
      order: 2,
    },
  });

  // Create subtopics for Real Analysis
  const sequences = await prisma.topic.create({
    data: {
      name: "Sequences and Series",
      slug: "sequences",
      description: "Ordered lists of numbers and their sums",
      parentId: realAnalysis.id,
      order: 1,
    },
  });

  const continuity = await prisma.topic.create({
    data: {
      name: "Continuity",
      slug: "continuity",
      description: "Functions without jumps or breaks",
      parentId: realAnalysis.id,
      order: 2,
    },
  });

  // Create problems for Derivatives
  await prisma.problem.createMany({
    data: [
      {
        topicId: derivatives.id,
        title: "Power Rule - Basic",
        body: `Find the derivative of $f(x) = x^5$.`,
        solution: `Using the power rule: $$\\frac{d}{dx}[x^n] = nx^{n-1}$$

$$f'(x) = 5x^{5-1} = 5x^4$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: derivatives.id,
        title: "Product Rule",
        body: `Find the derivative of $f(x) = x^2 \\cdot e^x$.`,
        solution: `Using the product rule: $$\\frac{d}{dx}[u \\cdot v] = u'v + uv'$$

Let $u = x^2$ and $v = e^x$. Then $u' = 2x$ and $v' = e^x$.

$$f'(x) = 2x \\cdot e^x + x^2 \\cdot e^x = e^x(2x + x^2)$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: derivatives.id,
        title: "Chain Rule",
        body: `Find the derivative of $f(x) = \\sin(x^3)$.`,
        solution: `Using the chain rule: $$\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$$

Let $u = x^3$. Then $f(x) = \\sin(u)$.

$$f'(x) = \\cos(x^3) \\cdot 3x^2 = 3x^2\\cos(x^3)$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: derivatives.id,
        title: "Quotient Rule",
        body: `Find the derivative of $f(x) = \\dfrac{x^2 + 1}{x - 3}$.`,
        solution: `Using the quotient rule: $$\\frac{d}{dx}\\left[\\frac{u}{v}\\right] = \\frac{u'v - uv'}{v^2}$$

Let $u = x^2 + 1$ and $v = x - 3$. Then $u' = 2x$ and $v' = 1$.

$$f'(x) = \\frac{2x(x-3) - (x^2+1)(1)}{(x-3)^2} = \\frac{2x^2 - 6x - x^2 - 1}{(x-3)^2} = \\frac{x^2 - 6x - 1}{(x-3)^2}$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: derivatives.id,
        title: "Implicit Differentiation",
        body: `Find $\\dfrac{dy}{dx}$ given $x^2 + y^2 = 25$.`,
        solution: `Differentiate both sides with respect to $x$:

$$\\frac{d}{dx}[x^2] + \\frac{d}{dx}[y^2] = \\frac{d}{dx}[25]$$

$$2x + 2y\\frac{dy}{dx} = 0$$

$$2y\\frac{dy}{dx} = -2x$$

$$\\frac{dy}{dx} = -\\frac{x}{y}$$`,
        difficulty: Difficulty.HARD,
      },
    ],
  });

  // Create problems for Integrals
  await prisma.problem.createMany({
    data: [
      {
        topicId: integrals.id,
        title: "Basic Power Rule Integration",
        body: `Evaluate $\\displaystyle\\int x^3 \\, dx$.`,
        solution: `Using the power rule for integration: $$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C, \\quad n \\neq -1$$

$$\\int x^3 \\, dx = \\frac{x^4}{4} + C$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: integrals.id,
        title: "Integration by Substitution",
        body: `Evaluate $\\displaystyle\\int 2x \\cos(x^2) \\, dx$.`,
        solution: `Let $u = x^2$, then $du = 2x \\, dx$.

$$\\int 2x \\cos(x^2) \\, dx = \\int \\cos(u) \\, du = \\sin(u) + C = \\sin(x^2) + C$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: integrals.id,
        title: "Integration by Parts",
        body: `Evaluate $\\displaystyle\\int x e^x \\, dx$.`,
        solution: `Using integration by parts: $$\\int u \\, dv = uv - \\int v \\, du$$

Let $u = x$ and $dv = e^x \\, dx$. Then $du = dx$ and $v = e^x$.

$$\\int x e^x \\, dx = xe^x - \\int e^x \\, dx = xe^x - e^x + C = e^x(x-1) + C$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: integrals.id,
        title: "Definite Integral",
        body: `Evaluate $\\displaystyle\\int_0^{\\pi} \\sin(x) \\, dx$.`,
        solution: `$$\\int_0^{\\pi} \\sin(x) \\, dx = [-\\cos(x)]_0^{\\pi}$$

$$= -\\cos(\\pi) - (-\\cos(0))$$

$$= -(-1) - (-1) = 1 + 1 = 2$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: integrals.id,
        title: "Partial Fractions",
        body: `Evaluate $\\displaystyle\\int \\frac{1}{x^2 - 1} \\, dx$.`,
        solution: `Factor the denominator: $x^2 - 1 = (x-1)(x+1)$

Use partial fractions:
$$\\frac{1}{(x-1)(x+1)} = \\frac{A}{x-1} + \\frac{B}{x+1}$$

Solving: $A = \\frac{1}{2}$, $B = -\\frac{1}{2}$

$$\\int \\frac{1}{x^2-1} \\, dx = \\frac{1}{2}\\ln|x-1| - \\frac{1}{2}\\ln|x+1| + C = \\frac{1}{2}\\ln\\left|\\frac{x-1}{x+1}\\right| + C$$`,
        difficulty: Difficulty.HARD,
      },
    ],
  });

  // Create problems for Limits
  await prisma.problem.createMany({
    data: [
      {
        topicId: limits.id,
        title: "Direct Substitution",
        body: `Evaluate $\\displaystyle\\lim_{x \\to 2} (3x + 1)$.`,
        solution: `By direct substitution:

$$\\lim_{x \\to 2} (3x + 1) = 3(2) + 1 = 7$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: limits.id,
        title: "Factoring",
        body: `Evaluate $\\displaystyle\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$.`,
        solution: `Factor the numerator:

$$\\lim_{x \\to 3} \\frac{(x-3)(x+3)}{x-3} = \\lim_{x \\to 3} (x+3) = 6$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: limits.id,
        title: "L'Hôpital's Rule",
        body: `Evaluate $\\displaystyle\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$.`,
        solution: `This gives $\\frac{0}{0}$, so apply L'Hôpital's Rule:

$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = \\lim_{x \\to 0} \\frac{\\cos(x)}{1} = \\cos(0) = 1$$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Matrices
  await prisma.problem.createMany({
    data: [
      {
        topicId: matrices.id,
        title: "Matrix Multiplication",
        body: `Given $A = \\begin{pmatrix} 1 & 2 \\ 3 & 4 \\end{pmatrix}$ and $B = \\begin{pmatrix} 5 & 6 \\ 7 & 8 \\end{pmatrix}$, find $AB$.`,
        solution: `$$AB = \\begin{pmatrix} 1(5) + 2(7) & 1(6) + 2(8) \\ 3(5) + 4(7) & 3(6) + 4(8) \\end{pmatrix}$$

$$= \\begin{pmatrix} 5 + 14 & 6 + 16 \\ 15 + 28 & 18 + 32 \\end{pmatrix} = \\begin{pmatrix} 19 & 22 \\ 43 & 50 \\end{pmatrix}$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: matrices.id,
        title: "Matrix Determinant",
        body: `Find the determinant of $A = \\begin{pmatrix} 4 & 7 \\ 2 & 6 \\end{pmatrix}$.`,
        solution: `For a $2 \\times 2$ matrix:

$$\\det(A) = ad - bc = 4(6) - 7(2) = 24 - 14 = 10$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: matrices.id,
        title: "Matrix Inverse",
        body: `Find the inverse of $A = \\begin{pmatrix} 2 & 3 \\ 1 & 4 \\end{pmatrix}$.`,
        solution: `First find the determinant: $\\det(A) = 2(4) - 3(1) = 5$

For a $2 \\times 2$ matrix:
$$A^{-1} = \\frac{1}{\\det(A)} \\begin{pmatrix} d & -b \\ -c & a \\end{pmatrix}$$

$$A^{-1} = \\frac{1}{5} \\begin{pmatrix} 4 & -3 \\ -1 & 2 \\end{pmatrix} = \\begin{pmatrix} \\frac{4}{5} & -\\frac{3}{5} \\ -\\frac{1}{5} & \\frac{2}{5} \\end{pmatrix}$$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Vectors
  await prisma.problem.createMany({
    data: [
      {
        topicId: vectors.id,
        title: "Dot Product",
        body: `Find the dot product of $\\mathbf{u} = \\begin{pmatrix} 2 \\ 3 \\ 4 \\end{pmatrix}$ and $\\mathbf{v} = \\begin{pmatrix} 1 \\ 5 \\ 2 \\end{pmatrix}$.`,
        solution: `$$\\mathbf{u} \\cdot \\mathbf{v} = 2(1) + 3(5) + 4(2) = 2 + 15 + 8 = 25$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: vectors.id,
        title: "Cross Product",
        body: `Find $\\mathbf{u} \\times \\mathbf{v}$ where $\\mathbf{u} = \\begin{pmatrix} 1 \\ 2 \\ 3 \\end{pmatrix}$ and $\\mathbf{v} = \\begin{pmatrix} 4 \\ 5 \\ 6 \\end{pmatrix}$.`,
        solution: `$$\\mathbf{u} \\times \\mathbf{v} = \\begin{pmatrix} 2(6) - 3(5) \\ 3(4) - 1(6) \\ 1(5) - 2(4) \\end{pmatrix} = \\begin{pmatrix} 12 - 15 \\ 12 - 6 \\ 5 - 8 \\end{pmatrix} = \\begin{pmatrix} -3 \\ 6 \\ -3 \\end{pmatrix}$$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Eigenvalues
  await prisma.problem.createMany({
    data: [
      {
        topicId: eigenvalues.id,
        title: "Find Eigenvalues",
        body: `Find the eigenvalues of $A = \\begin{pmatrix} 4 & 2 \\ 1 & 3 \\end{pmatrix}$.`,
        solution: `Solve $\\det(A - \\lambda I) = 0$:

$$\\det\\begin{pmatrix} 4-\\lambda & 2 \\ 1 & 3-\\lambda \\end{pmatrix} = (4-\\lambda)(3-\\lambda) - 2 = 0$$

$$12 - 7\\lambda + \\lambda^2 - 2 = 0$$

$$\\lambda^2 - 7\\lambda + 10 = 0$$

$$(\\lambda - 5)(\\lambda - 2) = 0$$

$$\\lambda = 5 \\text{ or } \\lambda = 2$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: eigenvalues.id,
        title: "Find Eigenvector",
        body: `Find an eigenvector for $\\lambda = 5$ of $A = \\begin{pmatrix} 4 & 2 \\ 1 & 3 \\end{pmatrix}$.`,
        solution: `Solve $(A - 5I)\\mathbf{v} = \\mathbf{0}$:

$$\\begin{pmatrix} -1 & 2 \\ 1 & -2 \\end{pmatrix} \\begin{pmatrix} v_1 \\ v_2 \\end{pmatrix} = \\begin{pmatrix} 0 \\ 0 \\end{pmatrix}$$

From row 1: $-v_1 + 2v_2 = 0$, so $v_1 = 2v_2$

An eigenvector is $\\mathbf{v} = \\begin{pmatrix} 2 \\ 1 \\end{pmatrix}$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Probability
  await prisma.problem.createMany({
    data: [
      {
        topicId: probability.id,
        title: "Basic Probability",
        body: `A fair die is rolled. What is the probability of rolling an even number?`,
        solution: `Sample space: $S = \\{1, 2, 3, 4, 5, 6\\}$

Event (even): $E = \\{2, 4, 6\\}$

$$P(E) = \\frac{|E|}{|S|} = \\frac{3}{6} = \\frac{1}{2}$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: probability.id,
        title: "Conditional Probability",
        body: `Given $P(A) = 0.4$, $P(B) = 0.5$, and $P(A \\cap B) = 0.2$, find $P(A|B)$.`,
        solution: `Using the formula for conditional probability:

$$P(A|B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{0.2}{0.5} = 0.4$$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Distributions
  await prisma.problem.createMany({
    data: [
      {
        topicId: distributions.id,
        title: "Binomial Distribution",
        body: `A coin is flipped 10 times. What is the probability of getting exactly 6 heads?`,
        solution: `Using the binomial distribution formula:

$$P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}$$

With $n = 10$, $k = 6$, $p = 0.5$:

$$P(X = 6) = \\binom{10}{6} (0.5)^6 (0.5)^4 = 210 \\cdot \\frac{1}{1024} = \\frac{210}{1024} \\approx 0.205$$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Combinatorics
  await prisma.problem.createMany({
    data: [
      {
        topicId: combinatorics.id,
        title: "Permutations",
        body: `How many ways can 5 people be arranged in a line?`,
        solution: `This is a permutation of 5 distinct objects:

$$5! = 5 \\times 4 \\times 3 \\times 2 \\times 1 = 120$$`,
        difficulty: Difficulty.EASY,
      },
      {
        topicId: combinatorics.id,
        title: "Combinations",
        body: `How many ways can you choose 3 people from a group of 8?`,
        solution: `Using the combination formula:

$$\\binom{8}{3} = \\frac{8!}{3!(8-3)!} = \\frac{8!}{3!5!} = \\frac{8 \\times 7 \\times 6}{3 \\times 2 \\times 1} = 56$$`,
        difficulty: Difficulty.EASY,
      },
    ],
  });

  // Create problems for Graph Theory
  await prisma.problem.createMany({
    data: [
      {
        topicId: graphTheory.id,
        title: "Handshaking Lemma",
        body: `A graph has 5 vertices with degrees 2, 3, 3, 4, and 2. How many edges does it have?`,
        solution: `By the Handshaking Lemma, the sum of all degrees equals twice the number of edges:

$$\\sum \\deg(v) = 2|E|$$

$$2 + 3 + 3 + 4 + 2 = 14 = 2|E|$$

$$|E| = 7$$`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Sequences
  await prisma.problem.createMany({
    data: [
      {
        topicId: sequences.id,
        title: "Geometric Series",
        body: `Find the sum of the geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{1}{2}\\right)^n$.`,
        solution: `For a geometric series with $|r| < 1$:

$$\\sum_{n=0}^{\\infty} r^n = \\frac{1}{1-r}$$

With $r = \\frac{1}{2}$:

$$\\sum_{n=0}^{\\infty} \\left(\\frac{1}{2}\\right)^n = \\frac{1}{1 - \\frac{1}{2}} = \\frac{1}{\\frac{1}{2}} = 2$$`,
        difficulty: Difficulty.MEDIUM,
      },
      {
        topicId: sequences.id,
        title: "Sequence Convergence",
        body: `Does the sequence $a_n = \\dfrac{3n + 1}{2n - 5}$ converge? If so, to what value?`,
        solution: `Divide numerator and denominator by $n$:

$$\\lim_{n \\to \\infty} \\frac{3n + 1}{2n - 5} = \\lim_{n \\to \\infty} \\frac{3 + \\frac{1}{n}}{2 - \\frac{5}{n}} = \\frac{3 + 0}{2 - 0} = \\frac{3}{2}$$

The sequence converges to $\\frac{3}{2}$.`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  // Create problems for Continuity
  await prisma.problem.createMany({
    data: [
      {
        topicId: continuity.id,
        title: "Continuity at a Point",
        body: `Is $f(x) = \\begin{cases} x^2 & x < 2 \\ 4 & x = 2 \\ x + 2 & x > 2 \\end{cases}$ continuous at $x = 2$?`,
        solution: `Check three conditions:

1. $f(2) = 4$ ✓

2. $\\lim_{x \\to 2^-} f(x) = \\lim_{x \\to 2^-} x^2 = 4$

3. $\\lim_{x \\to 2^+} f(x) = \\lim_{x \\to 2^+} (x + 2) = 4$

Since $\\lim_{x \\to 2} f(x) = 4 = f(2)$, the function is continuous at $x = 2$.`,
        difficulty: Difficulty.MEDIUM,
      },
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
