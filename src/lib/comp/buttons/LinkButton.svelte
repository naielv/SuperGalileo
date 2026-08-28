<script>
  import SvgIcon from "@jamescoyle/svelte-icon";
  import { mdiLink } from "@mdi/js";
  let { href, label, icon = mdiLink, background = "var(--accent)", disabled = false } = $props();
</script>

<a class="btn" href={href} style={`background: ${background};`} aria-disabled={disabled} tabindex={disabled ? -1 : 0}>
  <SvgIcon type="mdi" path={icon} />
  <span>{label}</span>
</a>