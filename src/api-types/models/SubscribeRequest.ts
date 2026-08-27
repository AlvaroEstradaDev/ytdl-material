/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SubscribeRequest = {
    name: string;
    url: string;
    timerange?: string;
    audioOnly?: boolean;
    customArgs?: string;
    customFileOutput?: string;
    useSubfolder?: boolean;
    autoCreatePlaylist?: boolean;
    maxQuality?: string;
    audioFormat?: string;
};
