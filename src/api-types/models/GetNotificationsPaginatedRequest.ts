/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { NotificationType } from './NotificationType';

export type GetNotificationsPaginatedRequest = {
    limit?: number;
    offset?: number;
    types?: Array<NotificationType>;
    unread_only?: boolean;
};
