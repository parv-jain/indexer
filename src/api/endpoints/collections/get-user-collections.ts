import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { ownershipFormat } from "@/api/types";
import { logger } from "@/common/logger";
import * as queries from "@/entities/collections/get-user-collections";

export const getUserCollectionsOptions: RouteOptions = {
  description: "Get user collections",
  tags: ["api"],
  validate: {
    params: Joi.object({
      user: Joi.string()
        .lowercase()
        .pattern(/^0x[a-f0-9]{40}$/)
        .required(),
    }),
    query: Joi.object({
      community: Joi.string().lowercase(),
      collection: Joi.string().lowercase(),
      offset: Joi.number().integer().min(0).default(0),
      limit: Joi.number().integer().min(1).max(20).default(20),
    }),
  },
  response: {
    schema: Joi.object({
      collections: Joi.array().items(
        Joi.object({
          collection: Joi.object({
            id: Joi.string(),
            name: Joi.string(),
          }),
          ownership: ownershipFormat,
        })
      ),
    }).label("getUserCollectionsResponse"),
    failAction: (_request, _h, error) => {
      logger.error(
        "get_user_collections_handler",
        `Wrong response schema: ${error}`
      );
      throw error;
    },
  },
  handler: async (request: Request) => {
    const params = request.params as any;
    const query = request.query as any;

    try {
      const collections = await queries.getUserCollections({
        ...params,
        ...query,
      } as queries.GetUserCollectionsFilter);

      return { collections };
    } catch (error) {
      logger.error("get_user_collections_handler", `Handler failure: ${error}`);
      throw error;
    }
  },
};
