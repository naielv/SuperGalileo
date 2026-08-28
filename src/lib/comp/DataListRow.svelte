<script>
	let {
		icon = null,
		content = null,
		actions = null,
		iconHref = null,
		iconLabel = '',
		className = ''
	} = $props();
</script>

<div class="data-list-card {className}" role="row">
	{#if icon}
		{#if iconHref}
			<a class="row-icon" href={iconHref} aria-label={iconLabel}>
				{@render icon()}
			</a>
		{:else}
			<div class="row-icon">{@render icon()}</div>
		{/if}
	{/if}

	<div class="row-content" role="presentation">
		{#if content}{@render content()}{/if}
	</div>
    {#if actions}
        <div class="row-actions actions no-print" role="group">{@render actions()}</div>
    {/if}
</div>

<style>
	.data-list-card {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: stretch;
		min-width: 0;
		overflow: hidden;
		border: 1px solid #888;
		border-radius: 12px 0 0 12px;
		background: #fff;
		box-shadow: 0 0 4px 4px rgb(15 23 42 / 7%);
		transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
	}

    @media print {
        .data-list-card {
            box-shadow: none;
            border: 1px solid #444;
		    grid-template-columns: auto minmax(0, 1fr);
        }
    }

	.data-list-card:hover {
		box-shadow: 0 0 14px 14px rgb(15 23 42 / 30%);
	}

	.row-icon {
		display: flex;
        flex-direction: column;
		align-items: center;
        max-width: 75px;
        text-align: center;
		justify-content: center;
		min-width: 70px;
		border-right: 1px solid #888;
		padding: 3px;
		color: inherit;
		text-decoration: none;
	}

	.row-icon :global(img),
	.row-icon :global(svg) {
		max-width: 100%;
	}

	.row-content {
        display: flex;
        align-items: stretch;
        align-content: center;
        flex-wrap: wrap;
        min-width: 0;
        gap: 8px;
        padding: 5px;
        justify-content: space-evenly;
	}

	.row-actions {
		border-left: 1px solid #888;
        display: flex;
        gap: 3px;
        width: 100%;
        padding: 3px;
        flex-direction: column;
        justify-content: flex-start;
        align-items: stretch;
	}

	@media (max-width: 700px) {
		.row-icon {
			min-width: 58px;
		}

		.row-content {
			padding: 8px;
		}
	}
</style>
