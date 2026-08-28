<script>
	let { label, options = [], icon, selected = $bindable() } = $props();
	let open = $state(false);
	let current = $derived(options.find((option) => option.value === selected) || null);

	function selectOption(value) {
		selected = value;
		open = false;
	}
</script>

<div class="picker" class:open>
	<button type="button" class="picker-summary" onclick={() => (open = !open)} aria-expanded={open}>
		<span class="picker-label">
            <img src={icon} alt="" />
            {label}
        </span>
		<span class="summary-option">
			{#if current}
				<!-- <span class="icon-strip">
					{#each current.icons as icon}
						<img src={icon} alt="" />
					{/each}
				</span> -->
				<span>{current.value}</span>
			{/if}
		</span>
		<span class="chevron" aria-hidden="true">{current ? '✓' : '⌄'}</span>
	</button>

	{#if open}
		<div class="options" role="listbox" aria-label={label}>
			{#each options as option}
				<button
					type="button"
					class:selected={selected === option.value}
					onclick={() => selectOption(option.value)}
					role="option"
					aria-selected={selected === option.value}
				>
					<span class="icon-strip">
						{#each option.icons as icon}
							<img src={icon} alt="" />
						{/each}
					</span>
					<span>{option.label || option.value}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.picker {
		position: relative;
		width: 100%;
	}
	.picker-summary {
		width: 100%;
		/* min-height: 48px; */
        display: flex;
        justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		border: 1px solid #94a3b8;
		border-radius: 5px;
		background: #fff;
		color: inherit;
		text-align: left;
		cursor: pointer;
		font-weight: 400;
	}
	.picker-label {
		font-size: 18px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.picker-label img {
		width: 32px;
		height: 32px;
	}
	.summary-option {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		min-width: 0;
		font-size: 15px;
	}
	.summary-option > span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.icon-strip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}
	.icon-strip img {
		width: 26px;
		height: 26px;
		object-fit: contain;
	}
	.chevron {
		font-size: 22px;
		line-height: 1;
	}
	.options {
		position: absolute;
		z-index: 10;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 6px;
		padding: 8px;
		border: 1px solid #94a3b8;
		border-radius: 5px;
		background: #fff;
		box-shadow: 0 8px 20px #0002;
	}
	.options button {
		min-height: 64px;
		display: flex;
        flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 7px;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
		background: #f8fafc;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}
	.options button:hover,
	.options button.selected {
		border-color: #2a4f90;
		background: #e0ecff;
	}
    .options button span{
        text-align: center;
    }
	.options button img {
		width: 46px;
		height: 46px;
	}
</style>
