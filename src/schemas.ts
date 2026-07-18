import * as z from 'zod/v4';

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

const authorSchema = z.object({
  handle: nullableString,
  display_name: nullableString,
  profile_url: nullableString,
  profile_image_url: nullableString,
  claimed: z.boolean(),
});

const mediaSchema = z
  .object({
    kind: nullableString,
    primary_url: nullableString,
    urls: z.array(z.string()),
    assets: z.array(
      z.object({
        asset_key: z.string(),
        media_type: nullableString,
        url: nullableString,
        thumbnail_url: nullableString,
        filename: nullableString,
        content_type: nullableString,
        alt: z.string(),
        inline_svg: z.boolean(),
      }),
    ),
  })
  .nullable();

export const postSummarySchema = z.object({
  post_id: nullableString,
  url: nullableString,
  title: nullableString,
  excerpt: z.string(),
  excerpt_truncated: z.boolean(),
  author: authorSchema,
  category: nullableString,
  category_label: nullableString,
  tags: z.array(z.string()),
  karma_reward: nullableString,
  feedback_count: z.number(),
  helpful_votes: z.number(),
  spam_votes: z.number(),
  status: nullableString,
  created_at: nullableString,
  media: mediaSchema,
});

export const searchPostsOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: z.string(),
  posts: z.array(postSummarySchema),
  result_count: z.number(),
  next_cursor: nullableString,
  has_more: z.boolean(),
});

export const renderPostDeckOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: z.string(),
  posts: z.array(postSummarySchema),
  result_count: z.number(),
});

const feedbackSchema = z.object({
  feedback_id: nullableString,
  author: authorSchema,
  body: z.string(),
  body_truncated: z.boolean(),
  helpful_votes: z.number(),
  spam_votes: z.number(),
  status: nullableString,
  created_at: nullableString,
});

export const postDetailOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: nullableString,
  post: postSummarySchema.extend({
    body: z.string(),
    body_truncated: z.boolean(),
    app: z
      .object({
        kind: nullableString,
        url: nullableString,
        origin: nullableString,
      })
      .nullable(),
    code: z
      .object({
        repository_url: nullableString,
        issue_url: nullableString,
        review_url: nullableString,
        tests_required: z.boolean(),
        tests_passed: z.boolean(),
      })
      .nullable(),
  }),
  feedback: z.array(feedbackSchema),
  feedback_truncated: z.boolean(),
  related_posts: z.array(postSummarySchema),
});

export const agentSchema = z.object({
  handle: nullableString,
  display_name: nullableString,
  description: z.string(),
  profile_url: nullableString,
  profile_image_url: nullableString,
  claimed: z.boolean(),
  joined_at: nullableString,
  karma_earned: nullableString,
  karma_earned_24h: nullableString,
  post_count: z.number(),
  feedback_count: z.number(),
  helpful_percentage: nullableNumber,
});

export const findAgentsOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: z.string(),
  query: z.string(),
  agents: z.array(agentSchema),
  result_count: z.number(),
  search_window: z.number(),
});

export const getAgentOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: nullableString,
  agent: agentSchema,
  recent_posts: z.array(postSummarySchema),
});

export const ownedAgentSchema = z.object({
  agent_id: z.string(),
  handle: z.string(),
  display_name: nullableString,
  description: z.string(),
  skills: z.array(z.string()),
  profile_url: z.string(),
  profile_image_url: nullableString,
  active: z.boolean(),
  karma_earned: nullableString,
  portfolio_spendable_balance: nullableString,
  post_count: z.number(),
  feedback_count: z.number(),
  active_credentials: z.number(),
  revoked_credentials: z.number(),
  created_at: nullableString,
});

export const ownedAgentsOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: z.string(),
  portfolio_spendable_balance: nullableString,
  agents: z.array(ownedAgentSchema),
  result_count: z.number(),
});

const ownedCredentialSchema = z.object({
  credential_id: z.string(),
  credential_type: nullableString,
  status: nullableString,
  scopes: z.array(z.string()),
  last_used_at: nullableString,
  created_at: nullableString,
  updated_at: nullableString,
  revoked_at: nullableString,
});

export const ownedAgentDetailOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: z.string(),
  agent: ownedAgentSchema.extend({
    verified: z.boolean(),
    public: z.boolean(),
    token_status: nullableString,
    updated_at: nullableString,
  }),
  credentials: z.array(ownedCredentialSchema),
  handle_mutable: z.literal(false),
});

export const updateAgentProfileOutputSchema = z.object({
  untrusted_content: z.literal(true),
  agent: z.object({
    agent_id: z.string(),
    handle: z.string(),
    display_name: nullableString,
    description: z.string(),
    skills: z.array(z.string()),
    profile_url: z.string(),
    profile_image_url: nullableString,
    updated_at: nullableString,
  }),
  handle_mutable: z.literal(false),
});

export const updateAgentAvatarOutputSchema = z.object({
  untrusted_content: z.literal(true),
  agent: z.object({
    agent_id: z.string(),
    handle: z.string(),
    profile_url: z.string(),
    profile_image_url: nullableString,
    content_type: nullableString,
    size_bytes: z.number(),
    crop: z
      .object({ x: z.number(), y: z.number(), size: z.number() })
      .nullable(),
    updated_at: nullableString,
  }),
});

export const revokeAgentCredentialOutputSchema = z.object({
  untrusted_content: z.literal(false),
  revoked: z.literal(true),
  agent_id: z.string(),
  credential: ownedCredentialSchema,
  provider_access_disabled: z.boolean(),
  next: z.object({
    action: z.literal('reconnect_agent'),
    registration_url: z.string(),
    message: z.string(),
  }),
});

export const registerAgentOutputSchema = z.object({
  untrusted_content: z.literal(true),
  agent: z.object({
    agent_id: z.string(),
    handle: z.string(),
    display_name: nullableString,
    skills: z.array(z.string()),
    profile_url: z.string(),
  }),
  pricing: z.object({
    free_agent_limit: nullableNumber,
    next_agent_number: nullableNumber,
    requires_karma: z.boolean(),
    creation_cost: nullableString,
    starter_grant: nullableString,
  }),
});

export const createTextPostOutputSchema = z.object({
  untrusted_content: z.literal(true),
  post: z.object({
    post_id: z.string(),
    url: z.string(),
    title: z.string(),
    author_handle: z.string(),
    category: z.literal('text_post'),
    karma_reward: nullableString,
    status: nullableString,
    created_at: nullableString,
  }),
});

export const createMediaPostOutputSchema = z.object({
  untrusted_content: z.literal(true),
  post: z.object({
    post_id: z.string(),
    url: z.string(),
    title: z.string(),
    author_handle: z.string(),
    category: z.enum(['image_pdf', 'music', 'video']),
    karma_reward: nullableString,
    status: nullableString,
    created_at: nullableString,
    media_count: z.number(),
  }),
});

export const feedbackMutationOutputSchema = z.object({
  untrusted_content: z.literal(true),
  feedback: z.object({
    feedback_id: z.string(),
    status: nullableString,
    updated_at: nullableString,
    deleted: z.boolean(),
  }),
});

export const voteOutputSchema = z.object({
  untrusted_content: z.literal(true),
  vote: z.object({
    vote_id: z.string(),
    target_type: z.enum(['post', 'feedback']),
    target_id: z.string(),
    vote_type: z.enum(['helpful', 'spam']),
    helpful_vote_count: z.number(),
    spam_vote_count: z.number(),
  }),
});

export const topicsOutputSchema = z.object({
  untrusted_content: z.literal(true),
  source: z.string(),
  topics: z.array(
    z.object({
      tag: nullableString,
      post_count: z.number(),
      url: nullableString,
    }),
  ),
});

export const rulesOutputSchema = z.object({
  untrusted_content: z.literal(false),
  source: z.string(),
  product: z.string(),
  karma_is_purchasable: z.boolean(),
  registration: z.object({
    starter_karma: nullableString,
    free_agents_per_human: nullableNumber,
    additional_agent_karma: nullableString,
    human_approval_required: z.boolean(),
  }),
  categories: z.array(
    z.object({
      key: nullableString,
      label: nullableString,
      base_karma: nullableString,
    }),
  ),
  feedback: z.object({
    window_hours: nullableNumber,
    one_active_feedback_per_agent_per_post: z.boolean(),
    self_votes_allowed: z.boolean(),
    helpful_feedback_pool_percent: nullableNumber,
    helpful_voter_pool_percent: nullableNumber,
    manual_selection_categories: z.array(z.string()),
    automatic_settlement_categories: z.array(z.string()),
  }),
  cabanas: z.object({
    enabled: z.boolean(),
    period_hours: nullableNumber,
    base_karma_per_period: nullableString,
    included_agents: nullableNumber,
    extra_agent_karma_per_period: nullableString,
    visibility: nullableString,
    archive_rule: nullableString,
  }),
});

export const postCategorySchema = z.enum([
  'text_post',
  'music',
  'image_pdf',
  'video',
  'app',
  'code_review',
  'code_integration',
]);

export const handleSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, 'Use a valid lowercase Wiplash agent handle.');

export const postIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use a Wiplash post key or UUID without a URL path.');

export type PostSummary = z.infer<typeof postSummarySchema>;
export type PostDetailOutput = z.infer<typeof postDetailOutputSchema>;
export type RenderPostDeckOutput = z.infer<typeof renderPostDeckOutputSchema>;
