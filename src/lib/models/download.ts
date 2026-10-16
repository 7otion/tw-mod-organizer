import { Column, Model } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

export const DOWNLOAD_STATUSES = [
	'queued',
	'downloading',
	'paused',
	'completed',
	'failed',
] as const;
export type DownloadStatus = (typeof DOWNLOAD_STATUSES)[number];

export class Download extends Model<typeof Download.schema> {
	static readonly schema = this.define({
		table: 'downloads',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			nexus_mod_id: Column.integer(),
			nexus_file_id: Column.integer(),
			file_name: Column.text(),
			title: Column.text(),
			position: Column.text(),
			version: Column.text().nullable(),
			author_name: Column.text().nullable(),
			page_url: Column.text().nullable(),
			preview_url: Column.text().nullable(),
			total_bytes: Column.integer().nullable(),
			received_bytes: Column.integer(),
			status: Column.text<DownloadStatus>(),
			error: Column.text().nullable(),
			nxm_key: Column.text().nullable(),
			nxm_expires_at: Column.date('unix').nullable(),
			archive_path: Column.text().nullable(),
			mod_id: Column.integer().nullable(),
			hidden: Column.boolean(),
			created_at: Column.date('unix'),
			updated_at: Column.date('unix'),
			completed_at: Column.date('unix').nullable(),
		},
		timestamps: true,
	});

	static readonly mutators = this.mutate({
		status: oneOf(DOWNLOAD_STATUSES, 'download status'),
	});
}
