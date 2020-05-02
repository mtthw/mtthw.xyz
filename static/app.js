
function click (event) {
  console.log(event)
  alert('ey')
  if (shouldPreventNavigation(event)) {
    //event.preventDefault()
    alert('yo')
  }
  //event.stopPropagation()
}


// TODO: What if you clikc a link that is wrapped by an anchor tag
function shouldPreventNavigation (event) {
  if (event.target.href) {
    return isForLocalSite(event.target.href, location.origin)
  }
  return false
}

function isForLocalSite (targetUrl, currentSite) {
  return isRelative(targetUrl) || matchesDomain(targetUrl, currentSite)
}

// TODO: what about blob:? or a href to base64 encode image?
function isRelative (url) {
  if (url.indexOf('mailto:') === 0) {return false} // URL is link to email address ( not really absolute or relative)
  if (url.indexOf('//') === 0) {return false} // URL is protocol-relative (= absolute)
  if (url.indexOf('://') === -1) {return true} // URL has no protocol (= relative)
  if (url.indexOf('.') === -1) {return true} // URL does not contain a dot, i.e. no TLD (= relative, possibly REST)
  if (url.indexOf('/') === -1) {return false} // URL does not contain a single slash (= relative)
  if (url.indexOf(':') > url.indexOf('/')) {return true} // The first colon comes after the first slash (= relative)
  if (url.indexOf('://') < url.indexOf('.')) {return false} // Protocol is defined before first dot (= absolute)
  return true // Anything else must be relative
}

// If is an absolute link. ie http://example.com https://example.com //example.com
function matchesDomain (url, currentOrigin) {
  const endOfOrigin = url.indexOf('/', url.indexOf('//') + 2)
  if (url.indexOf('//') === 0 && endOfOrigin === -1) {return url === currentOrigin.substring(currentOrigin.indexOf('//'))}
  if (url.indexOf('//') === 0 && endOfOrigin !== -1) {return url.substring(0, endOfOrigin) === currentOrigin.substring(currentOrigin.indexOf('//'))}
  if (endOfOrigin !== -1) {return url.substring(0, endOfOrigin) === currentOrigin}
  return url === currentOrigin
}


function testMono (fun, input, expected) {
  if (fun(input) !== expected) {
    console.error(`error: expected ${fun.name}(${input}) to be ${expected}`)
  }
}

function testDyad (fun, input1, input2, expected) {
  if (fun(input1, input2) !== expected) {
    console.error(`error: expected ${fun.name}(${input1}, ${input2}) to be ${expected}`)
  }
}



testMono(isRelative, 'example.com', true)
testMono(isRelative, 'home.php?reddirect=example.com', true)
testMono(isRelative, '//example.com', false)
testMono(isRelative, 'http://example.com', false)

testDyad(matchesDomain, 'http://example.com', 'http://example.com', true)
testDyad(matchesDomain, 'http://example.org', 'http://example.com', false)
testDyad(matchesDomain, 'http://example.com/test', 'http://example.com', true)
testDyad(matchesDomain, 'http://example.org/test', 'http://example.com', false)
testDyad(matchesDomain, 'https://example.com/test', 'http://example.com', false)
testDyad(matchesDomain, '//example.com', 'http://example.com', true)
testDyad(matchesDomain, '//example.org', 'http://example.com', false)
testDyad(matchesDomain, '//example.com/test', 'http://example.com', true)
testDyad(matchesDomain, '//example.org/test', 'http://example.com', false)
//testDyad(matchesDomain, '//example.com#test', 'http://example.com', true)// is this a working href value?


testDyad(isForLocalSite, 'https://example.com', 'https://example.com', true)
testDyad(isForLocalSite, 'https://example.com', 'http://example.com', false)
testDyad(isForLocalSite, '//example.com', 'http://example.com', true)
testDyad(isForLocalSite, '/about', 'http://example.com', true)
testDyad(isForLocalSite, '../', 'http://example.com', true)
testDyad(isForLocalSite, '..', 'http://example.com', true)

document.body.addEventListener("click", click)

