if (errorResult?.errorType === ErrorType.CONCEPTUAL_GAP) {
        let topicSlug = problem.topic?.slug;
        if (topicSlug) {
          // Increment the count for this error type and topic
          await incrementConceptualGapError(userId, topicSlug);
          // Check if this constitutes a misconception
          misconceptionDetected = await isMisconceptionDetected(
            userId,
            topicSlug
          );
        }
      }