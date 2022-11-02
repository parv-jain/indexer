/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import { RateLimitRules } from "@/models/rate-limit-rules";
import { RateLimitRuleEntity } from "@/models/rate-limit-rules/rate-limit-rule-entity";

export const getRateLimitRulesOptions: RouteOptions = {
  description: "Get rate limit rules",
  tags: ["api", "x-admin"],
  validate: {
    headers: Joi.object({
      "x-admin-api-key": Joi.string().required(),
    }).options({ allowUnknown: true }),
    query: Joi.object({
      route: Joi.string().description("The route to get rules for"),
    }),
  },
  handler: async (request: Request) => {
    if (request.headers["x-admin-api-key"] !== config.adminApiKey) {
      throw Boom.unauthorized("Wrong or missing admin API key");
    }

    const query = request.query as any;
    let rules: Map<string, RateLimitRuleEntity> = new Map();

    if (config.doApiWork) {
      try {
        const rateLimitRules = await RateLimitRules.getInstance();
        rules = rateLimitRules.getAllRules();

        if (query.route) {
          const response = [];
          for (const rule of rules.values()) {
            if (rule.route == query.route) {
              response.push(rule);
            }
          }

          return { rules: response };
        }
      } catch (error) {
        logger.error("post-update-api-key-tier-handler", `Handler failure: ${error}`);
        throw error;
      }
    }

    return {
      rules: Array.from(rules.values()),
    };
  },
};
