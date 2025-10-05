import { fromJS, is } from "immutable"

export function ArrayEqual(left, right) {
  return is(fromJS(left), fromJS(right))
}
