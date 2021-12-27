import { formatEth } from "@/common/bignumber";
import { db } from "@/common/db";

export type GetTransfersFilter = {
  contract?: string;
  tokenId?: string;
  collection?: string;
  attributes?: { [key: string]: string };
  user?: string;
  direction?: "from" | "to";
  type?: "sale" | "transfer";
  offset: number;
  limit: number;
};

export type GetTransfersResponse = {
  contract: string;
  tokenId: string;
  token: {
    name: string;
    image: string;
  };
  collection: {
    id: string;
    name: string;
  };
  from: string;
  to: string;
  amount: number;
  txHash: string;
  block: number;
  timestamp: number;
  price: number | null;
}[];

export const getTransfers = async (
  filter: GetTransfersFilter
): Promise<GetTransfersResponse> => {
  let baseQuery = `
    select
      "nte"."address" as "contract",
      "nte"."token_id" as "tokenId",
      "t"."name" as "tokenName",
      "t"."image" as "tokenImage",
      "c"."id" as "collectionId",
      "c"."name" as "collectionName",
      "nte"."from",
      "nte"."to",
      "nte"."amount",
      "nte"."tx_hash" as "txHash",
      "nte"."block",
      coalesce("b"."timestamp", extract(epoch from now())::int) as "timestamp",
      "fe"."price"
    from "nft_transfer_events" "nte"
    join "tokens" "t"
      on "nte"."address" = "t"."contract"
      and "nte"."token_id" = "t"."token_id"
    join "collections" "c"
      on "t"."collection_id" = "c"."id"
    left join "fill_events" "fe"
      on "nte"."tx_hash" = "fe"."tx_hash"
      and "nte"."from" = "fe"."maker"
    left join "blocks" "b"
      on "nte"."block" = "b"."block"
  `;

  // Filters
  const conditions: string[] = [];
  if (filter.contract) {
    conditions.push(`"nte"."address" = $/contract/`);
  }
  if (filter.tokenId) {
    conditions.push(`"nte"."token_id" = $/tokenId/`);
  }
  if (filter.collection) {
    conditions.push(`"t"."collection_id" = $/collection/`);
  }
  if (filter.attributes) {
    Object.entries(filter.attributes).forEach(([key, value], i) => {
      conditions.push(`
        exists(
          select from "attributes" "a"
          where "a"."contract" = "nte"."address"
            and "a"."token_id" = "nte"."token_id"
            and "a"."key" = $/key${i}/
            and "a"."value" = $/value${i}/
        )
      `);
      (filter as any)[`key${i}`] = key;
      (filter as any)[`value${i}`] = value;
    });
  }
  if (filter.user) {
    if (filter.direction === "from") {
      conditions.push(`"nte"."from" = $/user/`);
    } else if (filter.direction === "to") {
      conditions.push(`"nte"."to" = $/user/`);
    } else {
      conditions.push(`"nte"."from" = $/user/ or "nte"."to" = $/user/`);
    }
  }
  if (filter.type === "transfer") {
    conditions.push(`"fe"."price" is null`);
  } else if (filter.type === "sale") {
    conditions.push(`"fe"."price" is not null`);
  }
  if (conditions.length) {
    baseQuery += " where " + conditions.map((c) => `(${c})`).join(" and ");
  }

  // Sorting
  baseQuery += ` order by "nte"."block" desc`;

  // Pagination
  baseQuery += ` offset $/offset/`;
  baseQuery += ` limit $/limit/`;

  return db.manyOrNone(baseQuery, filter).then((result) =>
    result.map((r) => ({
      contract: r.contract,
      tokenId: r.tokenId,
      token: {
        name: r.tokenName,
        image: r.tokenImage,
      },
      collection: {
        id: r.collectionId,
        name: r.collectionName,
      },
      from: r.from,
      to: r.to,
      amount: Number(r.amount),
      txHash: r.txHash,
      block: r.block,
      timestamp: r.timestamp,
      price: r.price ? formatEth(r.price) : null,
    }))
  );
};
