<script>
	import { onMount, onDestroy } from 'svelte';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import {
		mdiRefresh,
		mdiSortAscending,
		mdiSortDescending,
		mdiFilter,
		mdiChevronDown,
		mdiChevronRight
	} from '@mdi/js';
	import { m } from '$lib/paraglide/messages';

	// Svelte 5 Props
	let {
		dbInstance = null,
		startkey = '',
		endkey = '',
		searchFields = [],
		filterFields = [], // Fields to auto-extract filter options for
		sortByFields = [], // e.g. [{ label: 'Nombre', key: 'Nombre' }]
		groupByFields = [], // e.g. [{ label: 'Región', key: 'Region' }]
		columns = [], // e.g. [{ label: 'Nombre', key: 'Nombre' }]
		rowSnippet = null, // Custom row snippet
		onLoad = null // Callback when data is loaded
	} = $props();
	let rawItems = $state([]);
	let searchQuery = $state('');
	let activeFilters = $state({});
	let sortBy = $state('');
	let sortDirection = $state('asc'); // 'asc' | 'desc'
	let groupBy = $state('');
	let collapsedGroups = $state({});
	let feedback = $state({ type: 'info', message: '' });
	let loading = $state(false);
	let changesFeed = $state(null);

	// Auto-extracted filter options for each filter field
	let filterOptions = $derived.by(() => {
		const options = {};
		filterFields.forEach((field) => {
			const values = new Set();
			rawItems.forEach((item) => {
				const val = item[field];
				if (val !== undefined && val !== null && val !== '') {
					values.add(val);
				}
			});
			options[field] = Array.from(values);
		});
		return options;
	});

	// Load data from PouchDB
	export async function loadData() {
		if (!dbInstance) return;
		loading = true;
		try {
			const result = await dbInstance.allDocs({
				startkey,
				endkey,
				include_docs: true,
                attachments: true, 
			});
            console.debug('DataTable loadData result:', result);
			// Support both doc.data and doc directly
			rawItems = result.rows
				.map((row) => {
					if (row.doc?.data) {
						return { ...row.doc.data, _id: row.doc._id, _rev: row.doc._rev, _attachments: row.doc._attachments };
					}
					return row.doc;
				})
				.filter((item) => item !== null && item !== undefined);

			if (onLoad) {
				onLoad(rawItems);
			}
		} catch (e) {
			feedback = { type: 'error', message: m.load_failed({ error: e.message }) };
		} finally {
			loading = false;
		}
	}

	// Filter, Sort, and Group items
	let processedItems = $derived.by(() => {
		// 1. Filter
		let items = rawItems.filter((item) => {
			// Search query
			const matchesSearch =
				!searchQuery ||
				searchFields.some((field) => {
					const val = item[field];
					return val && String(val).toLowerCase().includes(searchQuery.toLowerCase());
				});

			// Field filters
			const matchesFilters = Object.entries(activeFilters).every(([field, value]) => {
				if (!value || value === 'all') return true;
				return String(item[field]) === String(value);
			});

			return matchesSearch && matchesFilters;
		});

		// 2. Sort
		if (sortBy) {
			items.sort((a, b) => {
				let valA = a[sortBy];
				let valB = b[sortBy];

				if (typeof valA === 'string') valA = valA.toLowerCase();
				if (typeof valB === 'string') valB = valB.toLowerCase();

				if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
				if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			});
		}

		return items;
	});

	// Grouped items structure
	let groupedItems = $derived.by(() => {
		if (!groupBy) {
			return [{ key: 'all', label: '', items: processedItems }];
		}

		const groups = {};
		processedItems.forEach((item) => {
			const groupVal = item[groupBy] || m.ungrouped();
			if (!groups[groupVal]) {
				groups[groupVal] = [];
			}
			groups[groupVal].push(item);
		});

		return Object.entries(groups).map(([key, items]) => ({
			key,
			label: `${groupByFields.find((f) => f.key === groupBy)?.label || groupBy}: ${key}`,
			items
		}));
	});

	function toggleSort(field) {
		if (sortBy === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = field;
			sortDirection = 'asc';
		}
	}

	function toggleGroupCollapse(groupKey) {
		collapsedGroups[groupKey] = !collapsedGroups[groupKey];
	}

	function startChangesFeed() {
		stopChangesFeed();
		if (!dbInstance) return;

		const opts = {
			since: 'now',
			live: true,
			retry: true,
			include_docs: true
		};

		changesFeed = dbInstance.changes(opts)
			.on('change', (change) => {
				if (!change.doc) return;

				// Check if the changed doc is within our range
				if (startkey && (change.doc._id < startkey || change.doc._id > (endkey || startkey + '\ufff0'))) {
					return;
				}

				if (change.deleted) {
					// Remove from rawItems
					rawItems = rawItems.filter((item) => item._id !== change.id);
				} else {
					// Upsert: normalize the doc like loadData does
					const normalized = change.doc.data
						? { ...change.doc.data, _id: change.doc._id, _rev: change.doc._rev, _attachments: change.doc._attachments }
						: change.doc;

					const idx = rawItems.findIndex((item) => item._id === normalized._id);
					if (idx >= 0) {
						rawItems = rawItems.map((item, i) => (i === idx ? normalized : item));
					} else {
						rawItems = [...rawItems, normalized];
					}
				}
			})
			.on('error', (err) => {
				console.warn('DataTable changes feed error:', err);
			});
	}

	function stopChangesFeed() {
		if (changesFeed) {
			try { changesFeed.cancel(); } catch (e) { /* ignore */ }
			changesFeed = null;
		}
	}

	onMount(() => {
		loadData();
		startChangesFeed();
	});

	// Cleanup on destroy
	onDestroy(() => {
		stopChangesFeed();
	});
</script>

<div class="datatable-container">
	{#if feedback.message}
		<p class="status-banner {feedback.type}">{feedback.message}</p>
	{/if}

	<!-- Control Bar -->
	<div class="control-bar">
		<div class="search-and-filters">
			{#if searchFields.length > 0}
				<input type="text" bind:value={searchQuery} placeholder={m.search_dotdotdot()} class="search-input" />
			{/if}

			{#each filterFields as field}
				<div class="filter-select-wrapper">
					<select bind:value={activeFilters[field]} class="filter-select">
						<option value="all">({field})</option>
						{#each filterOptions[field] || [] as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</div>
			{/each}

			{#if groupByFields.length > 0}
				<div class="filter-select-wrapper">
					<select bind:value={groupBy} class="filter-select">
						<option value="">{m.ungrouped()}</option>
						{#each groupByFields as group}
							<option value={group.key}>{group.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if sortByFields.length > 0}
				<div class="filter-select-wrapper">
					<select bind:value={sortBy} class="filter-select">
						<option value="">{m.unsorted()}</option>
						{#each sortByFields as sort}
							<option value={sort.key}>{sort.label}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<button class="button mini-btn accent reload-btn" onclick={loadData} disabled={loading} title={m.reload()}>
			<SvgIcon path={mdiRefresh} type="mdi" size="2em" />
		</button>
	</div>

	<!-- Table-style list -->
	<div class="table-wrapper" role="table" aria-busy={loading}>
		<div class="data-list-body" role="rowgroup">
				{#each groupedItems as group}
					{#if groupBy}
						<div
							class="group-header-row"
							role="button"
							tabindex="0"
							aria-expanded={!collapsedGroups[group.key]}
							onclick={() => toggleGroupCollapse(group.key)}
							onkeydown={(event) =>
								(event.key === 'Enter' || event.key === ' ') && toggleGroupCollapse(group.key)}
						>
							<span class="group-chevron">
								{collapsedGroups[group.key] ? "x" : ">"}
							</span>
							<b>{group.label}</b>
							<span class="group-count">({group.items.length})</span>
						</div>
					{/if}

					{#if !collapsedGroups[group.key]}
						{#each group.items as item}
							{#if rowSnippet}
								{@render rowSnippet(item)}
							{:else}
								<div class="data-list-row" role="row">
									{#if groupBy}
										<div class="data-list-cell group-indent" role="cell"></div>
									{/if}
									{#each columns as col}
										<div class="data-list-cell" class:align-right={col.align === 'right'} role="cell">{item[col.key] ?? ''}</div>
									{/each}
								</div>
							{/if}
						{/each}
					{/if}
				{:else}
					<div class="no-data" role="row">
							{m.no_data()}
					</div>
				{/each}
		</div>
	</div>
</div>

<style>
	.datatable-container {
		border: 2px solid var(--accent);
		border-radius: 12px;
		width: 100%;
	}

	.status-banner {
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 15px;
		font-weight: bold;
	}

	.status-banner.success {
		background: #d9f7dd;
		color: #124218;
	}

	.status-banner.error {
		background: #ffe1e1;
		color: #6f1111;
	}

	.control-bar {
		display: flex;
		justify-content: space-between;
		align-items: stretch;
		color: #1f2937;
        color-scheme: light;
		border-radius: 12px;
		flex-wrap: wrap;
		gap: 0;
	}
    @media print {
        .control-bar {
            display: none;
        }
    }

	.control-bar input, .control-bar select {margin-bottom: 0 !important;}

	.search-and-filters {
		display: flex;
		gap: 0;
		flex-wrap: wrap;
		flex: 1;
	}

	.search-input {
		flex: 1;
		min-width: 200px;
		padding: 9px 12px;
		border: 2px solid var(--accent);
		border-top: none;
		border-left: none;
		border-right-width: 1px;
		border-radius: 8px 0 0 0;
		margin-top: 0 !important;
        color: #000;
        background: transparent;
	}
    .search-input::placeholder {
        color: #a0a;
    }
	.filter-select-wrapper {
		display: flex;
		align-items: center;
	}

	.filter-select {
		padding: 9px 16px 9px 12px;
		border: 2px solid var(--accent);
		border-radius: 0;
		border-left: none;
		border-top: none;
		border-right-width: 1px;
		background: transparent;
		margin-top: 0 !important;
		width: auto !important;
	}

	.reload-btn {
		border-radius: 0 8px 0 0;
		/* border-bottom: 2px solid var(--accent); */
	}

	.table-wrapper {
		padding: 15px;
        overflow: visible;
	}

	.data-list-body {
		display: grid;
		gap: 14px;
		grid-template-columns: repeat(auto-fill, minmax(275px, 1fr));
	}
	.group-header-row {
		background: var(--accent);
		color: #fff;
		grid-column: 1 / span all;
		padding: 5px 7.5px;
		text-align: center;
		border-radius: 8px;
		justify-self: center;
		display: flex;
		align-items: center;
		flex-direction: row;
		gap: 7.5px;
	}
	.group-chevron {
		font-family: monospace;
		font-size: 18px;
		text-align: center;
	}
	:global(.dl-field) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	:global(.dl-field small) {
		font-size: 13px;
		color: #444;
		font-weight: lighter;
	}
	:global(.dl-field a) {
		color: inherit;
		text-decoration: none;
	}

	.th-content {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.group-count {
		font-weight: lighter;
	}

	.no-data {
		grid-column: 1 / -1;
		text-align: center;
		padding: 30px;
		color: #666;
		background: #fafafa;
		border: 1px dashed #cbd5e1;
		border-radius: 12px;
	}

	@media (max-width: 700px) {
		.search-input {
			min-width: 0;
			flex-basis: 100%;
		}

		.search-and-filters {
			width: 100%;
		}

		.filter-select-wrapper,
		.filter-select {
			flex: 1;
		}

		:global(.data-list-row .data-list-cell.sm-right) {
			text-align: right;
			flex: none;
		}
	}
</style>
