<script>
	import heroImage from '$lib/assets/healthyfood.jpg';

	let { data } = $props();

</script>

<div class="workshop">
	<h1>Taller de cocina saludable</h1>

	{#if !data.configured}
		<section class="notice">
			<span class="notice-icon">!</span>
			<div>
				<h2>La despensa está cerrada</h2>
				<p>
					Configura <code>MEALIE_URL</code> y <code>MEALIE_API_TOKEN</code> en el servidor para cargar
					las recetas.
				</p>
			</div>
		</section>
	{:else}
		<!-- <form class="search" method="GET">
			<label for="search">¿Qué te apetece cocinar?</label>
			<div>
				<input
					id="search"
					name="search"
					value={data.search}
					placeholder="Buscar por nombre o ingrediente..."
				/><button type="submit">Buscar</button>
			</div>
		</form> -->

		{#if data.recipes.length}
			<div class="recipe-grid">
				{#each data.recipes as recipe, index}
					<a
						class="recipe-card"
						href={`/taller-cocina/receta/${encodeURIComponent(recipe.slug)}`}
					>
						<h3>{recipe.name}</h3>
						{#if recipe.description}<p>{recipe.description}</p>{/if}
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	:global(section.content) {
		padding: 0 !important;
	}
	.workshop {
		min-height: 100%;
		padding: 30px clamp(18px, 4vw, 55px);
		color: #30241e;
	}
	h1 {
		margin: 8px 0;
		font-size: clamp(2.3rem, 6vw, 5.5rem);
		line-height: 0.92;
		letter-spacing: -0.055em;
		text-align: center;
		color: white;
	}
	.search,
	.notice {
		max-width: 1180px;
		margin: 25px auto 0;
	}
	.search {
		padding: 17px 20px;
		border-radius: 15px;
		background: #3b5c43;
		color: white;
	}
	.search label {
		display: block;
		margin-bottom: 7px;
		font-weight: 700;
	}
	.search div {
		display: flex;
		gap: 8px;
	}
	.search input {
		flex: 1;
		min-width: 0;
		padding: 2.5px 15px;
		border: 0;
		font-size: 25px;
	}
	.search button {
		border: 0;
		border-radius: 8px;
		padding: 10px 18px;
		background: #e99a59;
		color: #382217;
		font-weight: 800;
		cursor: pointer;
	}
	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 13px;
		margin-top: 25px;
	}
	.recipe-card {
		display: block;
		padding: 16px;
		border: 1px solid #ead8ca;
		background: #f9e98d;
		border-radius: 13px;
		color: inherit;
		text-decoration: none;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}
	.recipe-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 20px #75452b1c;
	}
	.recipe-card h3 {
		margin: 0 0 8px;
		font-size: 1.2rem;
	}
	.recipe-card p {
		display: -webkit-box;
		overflow: hidden;
		margin: 0;
		color: #806c5e;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.notice {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 22px;
		border-radius: 15px;
		background: #fffaf5e8;
	}
	.notice-icon {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #d77847;
		color: white;
		font-weight: 900;
	}
	.notice h2 {
		margin: 0 0 4px;
	}
	.notice p {
		margin: 0;
		color: #806c5e;
	}
	code {
		padding: 2px 5px;
		border-radius: 4px;
		background: #f2dfd0;
	}
	@media (max-width: 480px) {
		.workshop {
			padding: 22px 14px;
		}
		.search div {
			display: block;
		}
		.search button {
			width: 100%;
			margin-top: 8px;
		}
	}

	/* The workshop is laid out like a recipe book on a wooden table. */
	.workshop {
		background-color: #a9683f;
		background-image:
			linear-gradient(#8f542f1c 1px, transparent 1px),
			linear-gradient(90deg, #8f542f12 1px, transparent 1px), url(${heroImage});
		background-size:
			34px 34px,
			34px 34px,
			cover;
		background-blend-mode: multiply, multiply, soft-light;
	}
	.search,
	.notice {
		position: relative;
	}
	.search {
		border: 1px solid #2c402e;
		border-radius: 3px;
		box-shadow: 4px 7px 0 #3b251d66;
		transform: rotate(0.25deg);
	}
	.recipe-grid {
		gap: 22px;
	}
	.recipe-card:hover {
		transform: translateY(-7px) rotate(0deg);
		box-shadow:
			7px 13px 0 #542d1e4d,
			0 16px 20px #3d211c33;
	}
</style>
