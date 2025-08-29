import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('billing')
export class BillingProcessor extends WorkerHost {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(
        job: Job<{
            userId: string;
            planId: string;
            subscriptionId: string;
            featureKey: string;
            periodStart: Date;
            periodEnd: Date;
            used: number;
        }>,
    ) {
        const {
            userId,
            planId,
            subscriptionId,
            featureKey,
            periodStart,
            periodEnd,
            used,
        } = job.data;
        await this.prisma.featureUsage.upsert({
            where: {
                userId_subscriptionId_featureKey_periodStart_periodEnd: {
                    userId,
                    subscriptionId,
                    featureKey,
                    periodStart,
                    periodEnd,
                },
            },
            update: { used },
            create: {
                userId,
                subscriptionId,
                featureKey,
                used,
                periodStart,
                periodEnd,
            },
        });
        await this.prisma.usageHistory.create({
            data: {
                userId,
                planId,
                description: `Feature ${featureKey} usage incremented`,
            },
        });
    }
}
