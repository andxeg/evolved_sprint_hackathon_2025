import type { HTMLAttributes } from 'react'

type IconProps = Omit<HTMLAttributes<SVGElement>, 'title'>

export const gitHub = (props: IconProps) => (
  <svg
    viewBox="0 0 438.549 438.549"
    {...props}
    aria-label="GitHub Icon"
    role="img" // Added role for better accessibility
  >
    <path
      fill="currentColor"
      d="M409.132 114.573c-19.608-33.596-46.205-60.194-79.798-79.8-33.598-19.607-70.277-29.408-110.063-29.408-39.781 0-76.472 9.804-110.063 29.408-33.596 19.605-60.192 46.204-79.8 79.8C9.803 148.168 0 184.854 0 224.63c0 47.78 13.94 90.745 41.827 128.906 27.884 38.164 63.906 64.572 108.063 79.227 5.14.954 8.945.283 11.419-1.996 2.475-2.282 3.711-5.14 3.711-8.562 0-.571-.049-5.708-.144-15.417a2549.81 2549.81 0 01-.144-25.406l-6.567 1.136c-4.187.767-9.469 1.092-15.846 1-6.374-.089-12.991-.757-19.842-1.999-6.854-1.231-13.229-4.086-19.13-8.559-5.898-4.473-10.085-10.328-12.56-17.556l-2.855-6.57c-1.903-4.374-4.899-9.233-8.992-14.559-4.093-5.331-8.232-8.945-12.419-10.848l-1.999-1.431c-1.332-.951-2.568-2.098-3.711-3.429-1.142-1.331-1.997-2.663-2.568-3.997-.572-1.335-.098-2.43 1.427-3.289 1.525-.859 4.281-1.276 8.28-1.276l5.708.853c3.807.763 8.516 3.042 14.133 6.851 5.614 3.806 10.229 8.754 13.846 14.842 4.38 7.806 9.657 13.754 15.846 17.847 6.184 4.093 12.419 6.136 18.699 6.136 6.28 0 11.704-.476 16.274-1.423 4.565-.952 8.848-2.383 12.847-4.285 1.713-12.758 6.377-22.559 13.988-29.41-10.848-1.14-20.601-2.857-29.264-5.14-8.658-2.286-17.605-5.996-26.835-11.14-9.235-5.137-16.896-11.516-22.985-19.126-6.09-7.614-11.088-17.61-14.987-29.979-3.901-12.374-5.852-26.648-5.852-42.826 0-23.035 7.52-42.637 22.557-58.817-7.044-17.318-6.379-36.732 1.997-58.24 5.52-1.715 13.706-.428 24.554 3.853 10.85 4.283 18.794 7.952 23.84 10.994 5.046 3.041 9.089 5.618 12.135 7.708 17.705-4.947 35.976-7.421 54.818-7.421s37.117 2.474 54.823 7.421l10.849-6.849c7.419-4.57 16.18-8.758 26.262-12.565 10.088-3.805 17.802-4.853 23.134-3.138 8.562 21.509 9.325 40.922 2.279 58.24 15.036 16.18 22.559 35.787 22.559 58.817 0 16.178-1.958 30.497-5.853 42.966-3.9 12.471-8.941 22.457-15.125 29.979-6.191 7.521-13.901 13.85-23.131 18.986-9.232 5.14-18.182 8.85-26.84 11.136-8.662 2.286-18.415 4.004-29.263 5.146 9.894 8.562 14.842 22.077 14.842 40.539v60.237c0 3.422 1.19 6.279 3.572 8.562 2.379 2.279 6.136 2.95 11.276 1.995 44.163-14.653 80.185-41.062 108.068-79.226 27.88-38.161 41.825-81.126 41.825-128.906-.01-39.771-9.818-76.454-29.414-110.049z"
    />
  </svg>
)

export const spinner = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label="Loading spinner"
    role="img"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

export const AuraIcon = (props: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      width="1rem"
      height="1rem"
      version="1.0"
      style={{
        shapeRendering: 'geometricPrecision',
        textRendering: 'geometricPrecision',
        fillRule: 'evenodd',
        clipRule: 'evenodd'
      }}
      viewBox="0 0 271 271"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-label="Aura, The bio engineer"
      role="img"
      {...props}
    >
      <defs>
        <style type="text/css">
          {`.fil6 {fill:#13D8A3}
            .fil5 {fill:#15A3D0}
            .fil0 {fill:#1678F1}
            .fil4 {fill:#89CC67}
            .fil3 {fill:#DB0096}
            .fil2 {fill:#E56464}
            .fil1 {fill:#FFB12F}
          `}
        </style>
      </defs>
      <g id="Capa_x0020_1">
        <metadata id="CorelCorpID_0Corel-Layer" />
        <g id="_2073370915936">
          <path
            className="fil0"
            d="M257 68l0 0c-7,0 -13,6 -13,14l0 27c0,7 6,13 13,13l0 0c7,0 14,-6 14,-13l0 -27c0,-7 -6,-14 -14,-14z"
          />
          <path
            className="fil1"
            d="M95 41l0 0c-7,0 -14,6 -14,14l0 95c0,7 6,13 14,13l0 0c7,0 14,-6 14,-13l0 -95c0,-7 -6,-14 -14,-14z"
          />
          <path
            className="fil2"
            d="M54 81l0 0c-7,0 -14,6 -14,14l0 68c0,7 6,13 14,13l0 0c7,0 13,-6 13,-13l0 -68c0,-7 -6,-14 -13,-14z"
          />
          <path
            className="fil3"
            d="M13 149l0 0c-7,0 -14,6 -14,13l0 27c0,7 6,14 14,14l0 0c7,0 13,-6 13,-14l0 -27c0,-7 -6,-13 -13,-13z"
          />
          <path
            className="fil4"
            d="M135 75l0 0c-7,0 -14,6 -14,14l0 95c0,7 6,14 14,14l0 0c7,0 13,-6 13,-14l0 -95c0,-7 -6,-14 -13,-14z"
          />
          <path
            className="fil5"
            d="M217 95l0 0c-7,0 -13,6 -13,14l0 69c0,7 6,13 13,13l0 0c7,0 14,-6 14,-13l0 -69c0,-7 -6,-14 -14,-14z"
          />
          <path
            className="fil6"
            d="M176 108l0 0c-7,0 -14,6 -14,13l0 95c0,7 6,14 14,14l0 0c7,0 14,-6 14,-14l0 -95c0,-7 -6,-13 -14,-13z"
          />
        </g>
      </g>
    </svg>
  )
}

export const AuraWithTextIcon = (props: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      version="1.0"
      style={{
        shapeRendering: 'geometricPrecision',
        textRendering: 'geometricPrecision',
        fillRule: 'evenodd',
        clipRule: 'evenodd'
      }}
      viewBox="0 0 501 116"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-label="Aura, The bio engineer"
      role="img"
      {...props}
    >
      <defs>
        <style type="text/css">
          {`
    .fil7 {fill:#13D8A3}
    .fil6 {fill:#15A3D0}
    .fil1 {fill:#1678F1}
    .fil5 {fill:#89CC67}
    .fil4 {fill:#DB0096}
    .fil3 {fill:#E56464}
    .fil2 {fill:#FFB12F}
   `}
        </style>
      </defs>
      <g id="Capa_x0020_1">
        <metadata id="CorelCorpID_0Corel-Layer" />
        <g id="_3058639071408">
          <path
            fill="currentColor"
            d="M442 102c-5,-3 -9,-8 -12,-14 -3,-6 -4,-12 -4,-20 0,-8 1,-14 4,-20 3,-6 7,-10 12,-13 5,-3 11,-5 18,-5 4,0 7,1 10,2 3,1 6,3 8,4 3,2 4,4 6,7l0 -11 17 0 0 74 -17 0 0 -12c-6,8 -13,12 -25,11 -6,0 -11,-2 -16,-5zm-249 5l39 -99 17 0 38 99 -19 0 -9 -24 -40 0 -9 24 -18 0 1 0zm61 -39l-7 -18 -2 -5 -3 -8 -3 -8 0 1 -3 7 -3 7c-1,3 -1,4 -3,6l-6 17 27 0 1 1zm65 39c-5,0 -10,-1 -14,-4 -4,-3 -7,-6 -9,-10 -2,-4 -3,-9 -3,-16l0 -45 16 0 0 41c0,10 5,18 16,18 9,0 17,-7 17,-16l0 -43 16 0 0 74 -16 0 0 -13c-1,1 -1,2 -3,4 -3,3 -6,5 -9,6 -4,2 -8,3 -11,3l-1 1zm57 0l0 -74 16 0 0 12c6,-14 23,-16 33,-12l-8 16c-11,-6 -25,4 -25,17l0 40 -16 0 -1 1zm88 -15c4,0 8,-1 11,-3 3,-2 6,-4 7,-8 2,-3 3,-8 3,-12 0,-4 -1,-8 -3,-12 -2,-3 -4,-6 -7,-8 -3,-2 -7,-3 -11,-3 -4,0 -8,1 -11,3 -3,2 -6,4 -7,8 -2,3 -3,8 -3,12 0,4 1,9 3,12 2,3 4,6 7,8 3,2 6,3 11,3z"
          />
          <path
            className="fil1"
            d="M158 17c-4,0 -8,4 -8,8l0 16c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -16c0,-4 -4,-8 -8,-8z"
          />
          <path
            className="fil2"
            d="M58 0c-4,0 -8,4 -8,8l0 58c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -58c0,-4 -4,-8 -8,-8z"
          />
          <path
            className="fil3"
            d="M33 25c-4,0 -8,4 -8,8l0 42c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -42c0,-4 -4,-8 -8,-8l0 0z"
          />
          <path
            className="fil4"
            d="M9 66c-4,0 -8,4 -8,8l0 16c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -16c0,-4 -4,-8 -8,-8z"
          />
          <path
            className="fil5"
            d="M83 21c-4,0 -8,4 -8,8l0 58c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -58c0,-4 -4,-8 -8,-8z"
          />
          <path
            className="fil6"
            d="M133 33c-4,0 -8,4 -8,8l0 42c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -42c0,-4 -4,-8 -8,-8z"
          />
          <path
            className="fil7"
            d="M108 41c-4,0 -8,4 -8,8l0 58c0,4 4,8 8,8 4,0 8,-4 8,-8l0 -58c0,-4 -4,-8 -8,-8l0 0z"
          />
        </g>
      </g>
    </svg>
  )
}

export const FastfoldSymbol = (props: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      version="1.0"
      style={{
        shapeRendering: 'geometricPrecision',
        textRendering: 'geometricPrecision',
        fillRule: 'evenodd',
        clipRule: 'evenodd'
      }}
      viewBox="0 0 271 271"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-label="Fastfold"
      role="img"
      {...props}
    >
      <g id="Capa_x0020_1">
        <metadata id="CorelCorpID_0Corel-Layer" />
        <g id="_2072966362432">
          <path
            fill="currentColor"
            d="M108 171l0 0c-24,24 -24,62 0,86l13 13 28 -28c9,-9 9,-22 0,-31l-41 -41z"
          />
          <path
            fill="currentColor"
            d="M163 100l0 0c24,-24 24,-62 0,-86l-13 -13 -28 28c-9,9 -9,23 0,31l41 41z"
          />
          <path
            fill="currentColor"
            d="M162 230l11 -11 27 -27 5 -5c8,-8 6,-24 -5,-34l-37 -37 -46 46 18 18 24 24c8,8 10,20 3,26z"
          />
          <path
            fill="currentColor"
            d="M109 41l-11 11 -27 27 -5 5c-8,8 -6,24 5,34l37 37 46 -46 -18 -18 -24 -24c-8,-8 -10,-20 -3,-26z"
          />
        </g>
      </g>
    </svg>
  )
}

const icons = {
  gitHub,
  spinner,
  AuraIcon,
  AuraWithTextIcon,
  FastfoldSymbol
}

// Export the variable
export default icons
