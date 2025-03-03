const mongoose = require("mongoose");
const Results = require("../models/results");

exports.GetPollResults = async (req, res) => {
  const poll_id = req.params.id;

  try {
    const results = await Results.aggregate([
      {
        $match: { poll_id: new mongoose.Types.ObjectId(poll_id) },
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
        $lookup: {
          from: "users",
          localField: "pollDetails.creator",
          foreignField: "_id",
          as: "creatorDetails",
        },
      },
      {
        $unwind: { path: "$creatorDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          isClosed: "$pollDetails.isClosed",
          title: "$pollDetails.title",
          description: "$pollDetails.description",
          creator: {
            _id: "$creatorDetails._id",
            name: "$creatorDetails.name",
          },
          createdAt: "$pollDetails.createdAt",
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
          multiple_choice: [
            { $match: { isRankingPoll: false } },
            { $unwind: "$options" },

            {
              $lookup: {
                from: "votes",
                let: { optionId: "$options._id", pollId: "$poll_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$poll_id", "$$pollId"] },
                          { $in: ["$$optionId", "$selected_options"] },
                        ],
                      },
                    },
                  },
                  {
                    $group: { _id: "$selected_options", votes: { $sum: 1 } },
                  },
                ],
                as: "options_votes",
              },
            },

            // merge vote count
            {
              $addFields: {
                "options.votes": {
                  $ifNull: [{ $arrayElemAt: ["$options_votes.votes", 0] }, 0],
                },
              },
            },

            {
              $sort: { "options.votes": -1 },
            },

            {
              $group: {
                _id: "$poll_id",
                poll_id: { $first: "$poll_id" },
                title: { $first: "$title" },
                poll_type: { $first: "$poll_type" },
                description: { $first: "$description" },
                creator: { $first: "$creator" },
                createdAt: { $first: "$createdAt" },
                isClosed: { $first: "$isClosed" },
                total_votes: { $first: "$total_votes" },
                results: {
                  $push: {
                    option_id: "$options._id",
                    option_name: "$options.option",
                    votes: "$options.votes",
                  },
                },
                ranking_results: { $push: "$$REMOVE" },
                winner: {
                  $first: {
                    $cond: [
                      { $eq: ["$isClosed", true] },
                      {
                        option_id: "$options._id",
                        option_name: "$options.option",
                        votes: "$options.votes",
                      },
                      null,
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
                _id: "$poll_id",
                poll_id: { $first: "$poll_id" },
                title: { $first: "$title" },
                description: { $first: "$description" },
                creator: { $first: "$creator" },
                createdAt: { $first: "$createdAt" },
                poll_type: { $first: "$poll_type" },
                isClosed: { $first: "$isClosed" },
                total_votes: { $first: "$total_votes" },
                results: { $push: "$$REMOVE" },
                ranking_results: {
                  $push: {
                    option_id: "$ranking_results.option_id",
                    option_name: "$ranking_results.option_name",
                    rank_score: "$ranking_results.rank_score",
                  },
                },

                winner: {
                  $first: {
                    $cond: [
                      { $eq: ["$isClosed", true] },
                      { $ifNull: ["$ranking_results", []] },
                      null,
                    ],
                  },
                },
              },
            },
            {
              $addFields: {
                ranking_results: {
                  $map: {
                    input: {
                      $sortArray: {
                        input: "$ranking_results",
                        sortBy: { rank_score: -1 },
                      },
                    },
                    as: "rank",
                    in: {
                      option_id: "$$rank.option_id",
                      option_name: "$$rank.option_name",
                      rank_score: "$$rank.rank_score",
                      ranking_position: {
                        $add: [
                          {
                            $indexOfArray: [
                              {
                                $map: {
                                  input: {
                                    $sortArray: {
                                      input: "$ranking_results",
                                      sortBy: { rank_score: -1 },
                                    },
                                  },
                                  as: "sorted",
                                  in: "$$sorted.rank_score",
                                },
                              },
                              "$$rank.rank_score",
                            ],
                          },
                          1,
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          mergedResults: { $concatArrays: ["$multiple_choice", "$ranking"] },
        },
      },
      { $unwind: "$mergedResults" },
      { $replaceRoot: { newRoot: "$mergedResults" } },
    ]);

    if (!results.length) {
      return res.status(204).json({ message: "No poll results found" });
    }

    return res.status(200).json(results[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};
