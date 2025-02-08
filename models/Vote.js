const mongoose = require("mongoose");
const results = require("../models/results");

const voteSchema = new mongoose.Schema({
  poll_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "poll",
    required: true,
  },
  selected_options: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  voter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  ip_address: {
    type: String,
    required: true,
  },
  ranks: [
    {
      option_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      rank_score: {
        type: Number,
        required: true,
      },
      rank_position: {
        type: Number,
        required: true,
      },
    },
  ],
  voted_at: {
    type: Date,
    default: Date.now(),
  },
});

voteSchema.pre("save", async function (next) {
  const poll = mongoose.model("poll");

  const Poll = await poll.findById(this.poll_id);

  if (!Poll) {
    return next(new Error("Poll not found"));
  }

  if (Poll.poll_type === "multiple_choice") {
    if (!Poll.poll_type && this.selected_options.length > 1) {
      return next(new Error("This poll only allows only one option"));
    }
  }

  if (this.selected_options.length > 0 && this.ranks.length > 0) {
    return next(new Error("Cannot have both multiple choice and Ranks"));
  }

  next();
});

voteSchema.post("save", async (doc, next) => {
  try {
    const Poll = mongoose.model("poll");

    const poll = await Poll.findById(doc.poll_id);

    switch (poll.poll_type) {
      case "multiple_choice":
        if (!poll.allow_multiple_votes && doc.selected_options.length === 1) {
          const result = await results.findOneAndUpdate(
            {
              poll_id: doc.poll_id,
              "results.option_id": doc.selected_options[0],
            },
            {
              $inc: { "results.$.votes": 1 },
            },
            { upsert: false }
          );

          if (!result) {
            await results.findOneAndUpdate(
              { poll_id: doc.poll_id }, // Find poll_id
              {
                $push: {
                  results: { option_id: doc.selected_options[0], votes: 1 },
                }, // Add new option
              },
              { upsert: true, new: true }
            );
          }
        }

        if (poll.allow_multiple_votes) {
          await Promise.all(
            doc.selected_options.map(async (selected_option) => {
              const result = await results.findOneAndUpdate(
                {
                  poll_id: doc.poll_id,
                  "results.option_id": selected_option,
                },
                {
                  $inc: { "results.$.votes": 1 },
                },

                { upsert: false }
              );

              if (!result) {
                await results.findOneAndUpdate(
                  {
                    poll_id: doc.poll_id,
                  },
                  {
                    $push: {
                      results: { option_id: selected_option, votes: 1 },
                    },
                  },
                  { upsert: true, new: true }
                );
              }
            })
          );
        }
        next();
        break;

      case "ranking":
        const maxScore = poll.options.length;
        await Promise.all(
          doc.ranks.map(async (rank) => {
            const rankScore = maxScore - rank.rank_position + 1;

            const result = await results.findOneAndUpdate(
              {
                poll_id: doc.poll_id,
                "ranking_results.option_id": rank.option_id,
              },
              {
                $inc: { "ranking_results.$.rank_score": rankScore },
              },

              { upsert: false }
            );

            if (!result) {
              await results.findOneAndUpdate(
                {
                  poll_id: doc.poll_id,
                 
                },

                {
                  $push: {
                    ranking_results: {
                      option_id: rank.option_id,
                      rank_score: rankScore,
                      ranking_position: rank.rank_position,
                    },
                  },
                },
                { upsert: true }
              );
            }
          })
        );

        const Results = await results.findOne({ poll_id: doc.poll_id });

        if (Results) {
          const sortedScores = Results.ranking_results.sort(
            (a, b) => b.rank_score - a.rank_score
          );

          sortedScores.forEach((results, index) => {
            results.ranking_position = index + 1;
          });

          Results.markModified("ranking_results");
          await Results.save();
        }
        next();
        break;
    }
  } catch (error) {
    console.error("Error updating results:", error);
    next(error);
  }
});

voteSchema.index({ poll_id: 1, ip_address: 1 }, { unique: true });

module.exports = mongoose.model("vote", voteSchema);
