import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('billing')
export class BillingProcessor extends WorkerHost {
    private readonly logger = new Logger(BillingProcessor.name);

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
        try {
            const {
                userId,
                planId,
                subscriptionId,
                featureKey,
                periodStart,
                periodEnd,
                used,
            } = job.data;

            // Update feature usage in database
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
                update: {
                    used,
                    updatedAt: new Date(),
                },
                create: {
                    userId,
                    subscriptionId,
                    featureKey,
                    used,
                    periodStart,
                    periodEnd,
                },
            });

            this.logger.log(
                `Updated feature usage for user ${userId}, feature ${featureKey}, usage: ${used}`,
            );

            return { success: true };
        } catch (error) {
            this.logger.error('Failed to process billing job', error);
            throw error;
        }
    }
}
