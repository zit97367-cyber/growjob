import { AtsType, VerificationTier } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { buildDedupeKey } from "../src/lib/ingest";

const companyNames = [
  "a16z crypto",
  "Alchemy",
  "Aptos",
  "Arbitrum Foundation",
  "Arweave",
  "Avalanche",
  "Aztec",
  "Base",
  "Binance",
  "Blockdaemon",
  "Blockstream",
  "Boba Network",
  "Chainalysis",
  "Chainlink Labs",
  "Circle",
  "Coinbase",
  "ConsenSys",
  "Cosmos",
  "Dapper Labs",
  "Dune",
  "Eigen Labs",
  "Electric Capital",
  "Elliptic",
  "Espresso",
  "Ethereum Foundation",
  "FalconX",
  "Fireblocks",
  "Flipside",
  "Galaxy",
  "Gitcoin",
  "Gnosis",
  "Helius",
  "Immutable",
  "Injective",
  "Kraken",
  "LayerZero",
  "Ledger",
  "Lido",
  "Magic Eden",
  "Matter Labs",
  "Metamask",
  "MoonPay",
  "Mysten Labs",
  "NEAR",
  "Noble",
  "OKX",
  "Optimism",
  "OpenSea",
  "Paxos",
  "Polygon Labs",
  "QuickNode",
  "Rainbow",
  "Rarible",
  "Scroll",
  "Sei",
  "Sismo",
  "Solana Foundation",
  "StarkWare",
  "Sui",
  "Syndicate",
  "Tenderly",
  "Tether",
  "The Graph",
  "Thirdweb",
  "Trust Wallet",
  "Uniswap Labs",
  "Web3Auth",
  "Wintermute",
  "Xapo",
  "XDEFI",
  "Yearn",
  "Zerion",
  "ZetaChain",
  "zkSync",
  "1inch",
  "0x",
  "Ankr",
  "Arkham",
  "Aura",
  "Biconomy",
  "BitGo",
  "Bitpanda",
  "Celo",
  "CertiK",
  "Chronicle",
  "Covalent",
  "CyberConnect",
  "dYdX",
  "Etherscan",
  "Forta",
  "Gelato",
  "Hyperlane",
  "Kaia",
  "Manta Network",
  "Mantle",
  "Nansen",
  "Offchain Labs",
  "Safe",
  "Sonic",
  "Taiko",
  "Worldcoin",
  "ZK Nation",
];

function toDomain(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20)}.com`;
}

async function main() {
  const now = new Date();
  for (const [index, name] of companyNames.entries()) {
    const domain = toDomain(name);
    const careersUrl =
      index % 4 === 0
        ? `https://boards.greenhouse.io/${domain.split(".")[0]}`
        : index % 4 === 1
          ? `https://jobs.lever.co/${domain.split(".")[0]}`
          : index % 4 === 2
            ? `https://jobs.ashbyhq.com/${domain.split(".")[0]}`
            : `https://careers.smartrecruiters.com/${domain.split(".")[0]}`;

    const atsType =
      index % 4 === 0
        ? AtsType.GREENHOUSE
        : index % 4 === 1
          ? AtsType.LEVER
          : index % 4 === 2
            ? AtsType.ASHBY
            : AtsType.SMARTRECRUITERS;

    await prisma.company.upsert({
      where: { websiteDomain: domain },
      update: {
        name,
        careersUrl,
        atsType,
        atsConfig:
          atsType === AtsType.GREENHOUSE
            ? { boardToken: domain.split(".")[0] }
            : atsType === AtsType.LEVER
              ? { handle: domain.split(".")[0] }
              : atsType === AtsType.ASHBY
                ? { orgSlug: domain.split(".")[0] }
                : { companyIdentifier: domain.split(".")[0] },
      },
      create: {
        name,
        websiteDomain: domain,
        careersUrl,
        atsType,
        atsConfig:
          atsType === AtsType.GREENHOUSE
            ? { boardToken: domain.split(".")[0] }
            : atsType === AtsType.LEVER
              ? { handle: domain.split(".")[0] }
              : atsType === AtsType.ASHBY
                ? { orgSlug: domain.split(".")[0] }
                : { companyIdentifier: domain.split(".")[0] },
      },
    });
  }

  const companies = await prisma.company.findMany({ take: 10, orderBy: { name: "asc" } });

  for (const [idx, company] of companies.entries()) {
    const title = idx % 2 === 0 ? "Senior Smart Contract Engineer" : "Web3 Product Designer";
    const applyUrl = `${company.careersUrl}/${idx + 1}`;
    const dedupeKey = buildDedupeKey({
      companyId: company.id,
      title,
      location: "Remote",
      applyUrl,
    });

    await prisma.job.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        companyId: company.id,
        title,
        location: "Remote",
        isRemote: true,
        description: "Build secure, scalable Web3 products.",
        applyUrl,
        publishedAt: now,
        firstSeenAt: now,
        verificationTier: VerificationTier.SOURCE_VERIFIED,
        dedupeKey,
      },
    });
  }

  console.log(`Seed complete: ${companyNames.length} companies + sample jobs`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
