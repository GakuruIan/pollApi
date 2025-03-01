const getPollResults = async (pollId) => {
  try {
    const results = await Result.aggregate([
      {
        $match: { poll_id: new mongoose.Types.ObjectId(pollId) },
      },
      {
        $lookup: {
          from: "polls",
          localField: "poll_id",
          foreignField: "_id",
          as: "pollDetails",
        },
      },
      { $unwind: "$pollDetails" },
      {
        $lookup: {
          from: "votes",
          localField: "poll_id",
          foreignField: "poll_id",
          as: "votes",
        },
      },
      {
        $addFields: {
          isClosed: "$pollDetails.isClosed",
          title: "$pollDetails.title",
          description: "$pollDetails.description",
          total_votes: { $size: "$votes" },
          options: "$pollDetails.options",
          poll_type: "$pollDetails.poll_type",
        },
      },
      {
        $addFields: {
          isRankingPoll: { $eq: ["$poll_type", "ranking"] },
        },
      },
      {
        $facet: {
          multipleChoice: [
            { $match: { isRankingPoll: false } },
            { $unwind: "$results" },
            {
              $addFields: {
                "results.option_name": {
                  $arrayElemAt: [
                    "$options.option",
                    { $indexOfArray: ["$options._id", "$results.option_id"] },
                  ],
                },
              },
            },
            { $sort: { "results.votes": -1 } },
            {
              $group: {
                _id: "$_id",
                poll_id: { $first: "$poll_id" },
                title: { $first: "$title" },
                description: { $first: "$description" },
                isClosed: { $first: "$isClosed" },
                total_votes: { $first: "$total_votes" },
                results: { $push: "$results" },
                ranking_results: { $first: [] },
                winner: {
                  $first: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$results",
                          as: "result",
                          cond: { $eq: ["$isClosed", true] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          ],
          ranking: [
            { $match: { isRankingPoll: true } },
            { $unwind: "$ranking_results" },
            {
              $addFields: {
                "ranking_results.option_name": {
                  $arrayElemAt: [
                    "$options.option",
                    {
                      $indexOfArray: [
                        "$options._id",
                        "$ranking_results.option_id",
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { "ranking_results.rank_score": -1 } },
            {
              $group: {
                _id: "$_id",
                poll_id: { $first: "$poll_id" },
                title: { $first: "$title" },
                description: { $first: "$description" },
                isClosed: { $first: "$isClosed" },
                total_votes: { $first: "$total_votes" },
                results: { $first: [] },
                ranking_results: {
                  $push: {
                    option_id: "$ranking_results.option_id",
                    option_name: "$ranking_results.option_name",
                    rank_score: "$ranking_results.rank_score",
                  },
                },
                winner: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$ranking_results",
                        as: "rank_result",
                        cond: { $eq: ["$isClosed", true] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          mergedResults: {
            $concatArrays: ["$multipleChoice", "$ranking"],
          },
        },
      },
      { $unwind: "$mergedResults" },
      { $replaceRoot: { newRoot: "$mergedResults" } },
    ]);

    if (!results.length) {
      return { error: "Poll results not found" };
    }

    return results[0];
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
};
