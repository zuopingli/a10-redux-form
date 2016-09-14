// only for conditional name interation
export const formatCondName = name => name.replace(/\./g, ':').replace(/\[(.+?)\]/g, '#$1')
export const unformatCondName = name => name.replace(/:/g, '.').replace(/#(.+?)/g, '[$1]')

