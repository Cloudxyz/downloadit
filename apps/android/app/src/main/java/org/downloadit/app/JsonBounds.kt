package org.downloadit.app

// Bound recursion before handing an untrusted object to Android's JSONTokener.
internal fun objectEnd(text: String,start: Int): Int {
    if(start !in text.indices || text[start]!='{')throw Problem("invalid")
    val stack=CharArray(64)
    var depth=0
    var quoted=false
    var escaped=false
    for(i in start until text.length){
        val c=text[i]
        if(quoted){
            if(escaped)escaped=false else if(c=='\\')escaped=true else if(c=='"')quoted=false
            if(c<' ')throw Problem("invalid")
        }else when(c){
            '"' -> quoted=true
            '{','[' -> {if(depth==stack.size)throw Problem("limit");stack[depth++]=if(c=='{')'}' else ']'}
            '}',']' -> {if(depth==0 || stack[--depth]!=c)throw Problem("invalid");if(depth==0)return i+1}
            // Android's lenient decoder also recognizes comments and single quotes.
            // Exclude them so both parsers agree on string and nesting boundaries.
            '\'','/','#' -> throw Problem("invalid")
        }
    }
    throw Problem("invalid")
}
