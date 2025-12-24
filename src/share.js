export async function shareUrlOrCopy({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return { shared: true }
    } catch (err) {
      return { shared: false, err }
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return { copied: true }
  } catch (err) {
    return { copied: false, err }
  }
}

export async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (e) {
      return false
    }
  }
  return false
}
