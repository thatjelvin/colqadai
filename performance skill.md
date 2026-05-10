# Performance Skill

## Core Philosophy

Performance in software engineering extends beyond mere speed; it encompasses the entire user experience, from initial load to ongoing interaction. The core philosophy is to build products that are not only fast but *feel* fast, creating a seamless and delightful user experience. This involves optimizing for both **objective performance metrics** (e.g., Core Web Vitals, load times) and **perceived performance** (how quickly users *feel* the application is responding). A high-performing product reduces user frustration, improves engagement, boosts conversion rates, and positively impacts SEO. It requires a holistic approach, considering every layer of the application stack and the entire user journey.

## Principles

1.  **User-Centric Speed**: Prioritize performance improvements that directly impact the user experience and their perception of speed.
2.  **Measure, Don't Guess**: Rely on real-world data and metrics (e.g., Core Web Vitals, RUM) to identify bottlenecks and validate optimizations.
3.  **Holistic Optimization**: Consider performance across all layers: frontend, backend, database, and network. A chain is only as strong as its weakest link.
4.  **Perceived Performance**: Implement techniques that make the application *feel* faster, even if objective load times are similar (e.g., skeleton screens, optimistic UI).
5.  **Performance Budgets**: Establish clear, measurable performance targets and integrate them into the development workflow to prevent performance regressions.
6.  **Progressive Enhancement**: Deliver core content and functionality quickly, then progressively add more complex features and enhancements.
7.  **Resource Efficiency**: Optimize resource usage (CPU, memory, battery) on both client and server to ensure a smooth experience across diverse devices and network conditions.
8.  **Continuous Monitoring**: Performance is not a one-time fix; it requires ongoing monitoring, testing, and optimization.

## Frameworks

### 1. Core Web Vitals (CWV)

**Core Concept**: A set of specific, quantifiable metrics from Google that measure real-world user experience for loading performance, interactivity, and visual stability of a page. They are crucial for SEO and overall user satisfaction [1].

**The Three Core Web Vitals**:

*   **Largest Contentful Paint (LCP)**: Measures *loading performance*. It reports the render time of the largest image or text block visible within the viewport, relative to when the page first started loading. Good LCP is typically under 2.5 seconds.
*   **First Input Delay (FID)**: Measures *interactivity*. It quantifies the time from when a user first interacts with a page (e.g., clicks a button) to the time when the browser is actually able to begin processing event handlers for that interaction. FID will be replaced by Interaction to Next Paint (INP) in March 2024. Good FID is typically under 100 milliseconds.
*   **Cumulative Layout Shift (CLS)**: Measures *visual stability*. It quantifies the unexpected shifting of visual page content. A low CLS score ensures that users don't experience unexpected content movement. Good CLS is typically under 0.1.

**AI-Agent Guidance**: When developing or auditing a web application, an AI agent should prioritize optimizing for Core Web Vitals. Use tools like Lighthouse to measure these metrics and identify areas for improvement. For example, to improve LCP, focus on optimizing critical rendering path, image sizes, and server response times. To improve CLS, ensure images and embeds have explicit dimensions.

### 2. Perceived Performance Techniques

**Core Concept**: Strategies that make an application *feel* faster to the user, even if the actual processing time remains the same. This manages user expectations and reduces perceived waiting times [2].

**Key Techniques**:

*   **Skeleton Screens**: Displaying a simplified, wireframe version of the UI while content is loading. This gives users a sense of progress and reduces perceived waiting time compared to a blank screen or spinner.
*   **Optimistic UI**: Updating the UI immediately after a user action, assuming the action will succeed on the server. If the server operation fails, the UI can then revert. This provides instant feedback and a highly responsive feel.
*   **Loading States & Progress Indicators**: Using subtle animations, progress bars, or spinners to clearly communicate that an action is in progress. Avoid indefinite spinners.
*   **Prefetching/Preloading**: Anticipating user actions and loading resources (e.g., next page data, images) in the background before they are explicitly requested.
*   **Animation & Transitions**: Using smooth, subtle animations to mask latency and guide user attention during state changes.

**AI-Agent Guidance**: When designing user interfaces or interactions, an AI agent should incorporate perceived performance techniques. For instance, for data-intensive pages, implement skeleton screens. For actions like submitting a form, use optimistic UI updates to provide immediate feedback. When navigating between pages, consider prefetching data for the next likely destination.

## Operational Rules

1.  **Optimize Critical Rendering Path**: Prioritize loading essential CSS and JavaScript first to render the initial view as quickly as possible.
2.  **Image Optimization**: Compress images, use modern formats (e.g., WebP), and implement responsive images (`srcset`, `sizes`) to deliver appropriately sized images for different devices.
3.  **Lazy Loading**: Defer loading of off-screen images, videos, and components until they are needed, reducing initial page load time.
4.  **Code Splitting & Tree Shaking**: Break down JavaScript bundles into smaller chunks and remove unused code to reduce the amount of code shipped to the browser.
5.  **Caching Strategies**: Implement effective caching for static assets (CDN, browser cache) and dynamic data (server-side caching, stale-while-revalidate) to reduce network requests.
6.  **Minimize Network Requests**: Combine CSS/JS files, use CSS sprites, and reduce third-party scripts where possible.
7.  **Server-Side Rendering (SSR) / Static Site Generation (SSG)**: For content-heavy pages, leverage SSR or SSG to deliver fully rendered HTML to the browser, improving LCP and SEO.
8.  **Database Query Optimization**: Ensure database queries are efficient, indexed, and avoid N+1 problems to reduce backend response times.
9.  **Monitor Third-Party Scripts**: Regularly audit and optimize third-party scripts (analytics, ads, widgets) as they can significantly impact performance.

## AI-Agent Execution Guidance

*   **Performance Budget Enforcement**: When a new feature or component is developed, automatically check its impact against predefined performance budgets (e.g., bundle size, Lighthouse score). Flag any regressions and suggest optimizations.
*   **Automated Optimization**: Integrate tools for automated image compression, code minification, and tree-shaking into the build pipeline. The AI should ensure these are configured and running effectively.
*   **Lighthouse Audit Integration**: Before deployment, automatically run Lighthouse audits and generate a report. The AI should analyze the report, identify critical issues, and suggest actionable steps for improvement, referencing specific techniques from this skill.
*   **Loading State Implementation**: When designing any data fetching or asynchronous operation, the AI should automatically suggest and implement appropriate loading states (skeleton screens, progress indicators) to enhance perceived performance.
*   **Database Performance Review**: For backend changes, the AI should analyze proposed database queries for efficiency, suggest indexes, and identify potential N+1 query issues.

## Real-World Implementation Patterns

*   **Vercel Optimization Guides**: Vercel, the creator of Next.js, provides extensive documentation and best practices for optimizing web applications, particularly for React and Next.js, focusing on fast build times, serverless functions, and global CDN delivery [3].
*   **Lighthouse Standards**: Google Lighthouse is an open-source, automated tool for improving the quality of web pages. It provides audits for performance, accessibility, progressive web apps, SEO, and more [4]. Adhering to its recommendations is a standard practice.
*   **Modern React Optimization**: Techniques like `React.memo`, `useCallback`, `useMemo`, virtualized lists, and efficient state management are crucial for optimizing rendering performance in React applications.
*   **High-Performance SaaS Systems**: Companies like Notion, Figma, and Stripe invest heavily in performance, using techniques such as WebAssembly, advanced caching, and highly optimized rendering engines to deliver desktop-app-like experiences in the browser.

## Mistakes to Avoid

*   **Ignoring Initial Load**: Focusing only on post-load interactivity while neglecting the critical first impression of page load.
*   **Over-reliance on Spinners**: Using generic loading spinners for extended periods, which can increase perceived waiting time and user frustration.
*   **Premature Optimization**: Spending excessive time optimizing code that has little impact on overall user experience or critical metrics. Focus on bottlenecks first.
*   **Large JavaScript Bundles**: Shipping too much JavaScript to the client, leading to slow parsing, compilation, and execution times.
*   **Unoptimized Images**: Using large, uncompressed images that consume significant bandwidth and slow down page loads.
*   **Lack of Caching**: Failing to implement effective caching strategies, leading to redundant data fetching and slower response times.
*   **Ignoring Mobile Performance**: Developing primarily for desktop and neglecting the performance implications for mobile devices and slower networks.
*   **Not Monitoring Performance**: Treating performance as a one-off task rather than an ongoing process of measurement, optimization, and monitoring.

## Self-Review Systems

**Performance Audit Checklist**:

*   [ ] Are Core Web Vitals (LCP, FID/INP, CLS) within acceptable thresholds?
*   [ ] Is the critical rendering path optimized?
*   [ ] Are images optimized (compressed, modern formats, responsive)?
*   [ ] Is lazy loading implemented for off-screen content?
*   [ ] Is code splitting and tree shaking effectively reducing bundle sizes?
*   [ ] Are caching strategies (browser, CDN, server) in place?
*   [ ] Are network requests minimized and optimized?
*   [ ] Is perceived performance enhanced with skeleton screens, optimistic UI, or other techniques?
*   [ ] Is the application performing well on mobile devices and slower networks?
*   [ ] Are third-party scripts audited and optimized for performance impact?

## Quality Scoring Systems

**Performance Health Score (PHS)**: A composite score based on:

*   **Core Web Vitals Score (0-5)**: Average score across LCP, FID/INP, and CLS (e.g., 5 for all green, 0 for all red).
*   **Load Time (0-5)**: How quickly the page becomes interactive and visually complete.
*   **Responsiveness (0-5)**: How quickly the UI responds to user input.
*   **Resource Efficiency (0-5)**: Optimization of CPU, memory, and network usage.
*   **Perceived Speed (0-5)**: Effectiveness of techniques like skeleton screens and optimistic UI.

**Formula**: `PHS = (Core Web Vitals Score + Load Time + Responsiveness + Resource Efficiency + Perceived Speed) / 5`

**Interpretation**: A higher PHS indicates a more performant and user-friendly application. This score can be used to track performance improvements over time and benchmark against industry standards.

## Checklists

### Frontend Performance Optimization Checklist

*   [ ] Minify CSS, JavaScript, and HTML.
*   [ ] Enable Gzip or Brotli compression for text-based assets.
*   [ ] Optimize images (compress, resize, WebP, responsive images).
*   [ ] Implement lazy loading for images and videos.
*   [ ] Use `font-display: swap` for web fonts.
*   [ ] Eliminate render-blocking resources (CSS, JS).
*   [ ] Implement code splitting for JavaScript bundles.
*   [ ] Use a CDN for static assets.
*   [ ] Leverage browser caching with appropriate `Cache-Control` headers.
*   [ ] Reduce server response times (TTFB).
*   [ ] Optimize critical rendering path.
*   [ ] Implement skeleton screens or other perceived performance techniques.
*   [ ] Monitor and optimize third-party scripts.

### Backend & Database Performance Checklist

*   [ ] Optimize database queries (indexes, avoid N+1).
*   [ ] Implement database connection pooling.
*   [ ] Use server-side caching (e.g., Redis, Memcached).
*   [ ] Optimize API endpoints for faster response times.
*   [ ] Implement efficient data serialization/deserialization.
*   [ ] Use a CDN for API responses where appropriate.
*   [ ] Monitor server resource utilization (CPU, memory).
*   [ ] Scale backend services horizontally when needed.
*   [ ] Optimize background jobs and asynchronous tasks.

## Production Standards

*   **Continuous Performance Monitoring**: Implement Real User Monitoring (RUM) and Synthetic Monitoring to continuously track performance metrics in production and alert on regressions.
*   **Automated Performance Testing**: Integrate performance tests (e.g., Lighthouse CI, WebPageTest) into the CI/CD pipeline to catch issues before deployment.
*   **Performance Budgets**: Enforce performance budgets at build time to prevent new code from degrading performance.
*   **A/B Testing Performance Improvements**: Measure the real-world impact of performance optimizations on user behavior and business metrics.
*   **Regular Performance Audits**: Conduct periodic deep-dive performance audits to identify complex bottlenecks and areas for architectural improvement.
*   **Documentation**: Document performance goals, key metrics, and optimization strategies.

## References

[1] Core Web Vitals. (n.d.). web.dev. Retrieved from [https://web.dev/vitals/](https://web.dev/vitals/)
[2] to110i/perceived-performance - Agent Skill. (n.d.). Awesomeskills.dev. Retrieved from [https://www.awesomeskills.dev/en/skill/to110i-perceived-performance](https://www.awesomeskills.dev/en/skill/to110i-perceived-performance)
[3] Vercel Optimization Guides. (n.d.). Vercel. Retrieved from [https://vercel.com/docs/concepts/optimize](https://vercel.com/docs/concepts/optimize)
[4] Lighthouse. (n.d.). Google Developers. Retrieved from [https://developers.google.com/web/tools/lighthouse](https://developers.google.com/web/tools/lighthouse)
