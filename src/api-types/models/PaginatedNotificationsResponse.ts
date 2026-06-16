/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Notification } from './Notification';

export type PaginatedNotificationsResponse = {
    items: Array<Notification>;
    total: number;
    limit: number;
    offset: number;
};
