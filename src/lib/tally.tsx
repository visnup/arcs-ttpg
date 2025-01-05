import {
  refPackageId as _refPackageId,
  Color,
  HorizontalAlignment,
} from "@tabletop-playground/api";
import { canvasChild, jsxInTTPG } from "jsx-in-ttpg";

const refPackageId = _refPackageId;
const textColor = new Color(38 / 255, 31 / 255, 21 / 255).lighten(-0.85);

export function Tally({
  value,
  color,
}: {
  value: number;
  color: JSX.IntrinsicElements["image"]["color"];
}) {
  const height = 70;
  const width = 70;
  return (
    <layout width={width} height={height}>
      <canvas>
        {canvasChild(
          { x: 0, y: 0, width, height },
          <image src="circle.png" srcPackage={refPackageId} color={color} />,
        )}
        {canvasChild(
          { x: 0, y: -2, width, height },
          <layout width={width} halign={HorizontalAlignment.Center}>
            <text
              color={textColor}
              size={32}
              font="FMBolyarPro-900.ttf"
              fontPackage={refPackageId}
            >
              {value}
            </text>
          </layout>,
        )}
      </canvas>
    </layout>
  );
}
