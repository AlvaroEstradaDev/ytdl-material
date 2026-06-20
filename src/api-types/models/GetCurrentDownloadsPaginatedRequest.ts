/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type GetCurrentDownloadsPaginatedRequest = {
    limit?: number;
    offset?: number;
    filters?: {
        titleRegex?: string;
        progressStages?: Array<string>;
        dateRange?: {
            from?: number;
            to?: number;
            preset?: string;
        };
        subscriptions?: Array<string>;
    };
};
